import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod'
import { prisma } from "../lib/prisma";
import localizedFormat from 'dayjs/plugin/localizedFormat';
import dayjs from 'dayjs';
import 'dayjs/locale/es-mx'
import nodemailer from 'nodemailer'
import { getMailClient } from "../lib/mail";

dayjs.locale('es-mx')
dayjs.extend(localizedFormat);

export async function createTrip(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/trips', {
        schema: {
            body: z.object({
                destination: z.string().min(4),
                starts_at: z.coerce.date(),
                ends_at: z.coerce.date(),
                owner_name: z.string(),
                owner_email: z.string().email(),
                emails_to_invite: z.array(z.string().email())
            })
        }
    }, async (request) => {
        const { destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite } = request.body;

        if (dayjs(starts_at).isBefore(new Date())) {
            throw new Error('Invalid trip start date')
        }

        if (dayjs(ends_at).isBefore(starts_at)) {
            throw new Error('Invalid trip end date');
        }



        const trip = await prisma.trip.create({
            data: {
                destination,
                starts_at,
                ends_at,
                participants: {
                    createMany: {
                        data: [
                            {
                                name: owner_name,
                                email: owner_email,
                                is_owner: true,
                                is_confirmed: true,
                            },
                            ...emails_to_invite.map(email => {
                                return { email }
                            })
                        ]
                    }
                }
            }

        });

        const fortmattedStartDate = dayjs(starts_at).format('LL')
        const fortmattedEndsDate = dayjs(ends_at).format('LL')

        const confirmationLink =  `http://localhost:3000/trips/${trip.id}/confirm`;

        const mail = await getMailClient();

        const message = await mail.sendMail({
            from: {
                name: 'Equipo Planner',
                address: 'dontreply@plann.com'
            },
            to: {
                name: owner_name,
                address: owner_email
            },
            subject:`Confirme su viaje para ${destination} el ${fortmattedStartDate}`,
            html: `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
            <p>Te han invitado a participar en un viaje a <strong>${destination}</strong> en las fechas de <strong>${fortmattedStartDate}</strong> hasta <strong>${fortmattedEndsDate}</strong>.</p>
            <p></p>
            <p>Para confirmar su presencia en el viaje, haga clic en el siguiente enlace:</p>
            <p></p>
            <p>
            <a href="${confirmationLink}">Confirmar viaje</a>
            </p>
            <p></p>
            <p>Si no sabe de qué se trata este correo electrónico, simplemente ignórelo.</p>
            </div>
            `.trim()
        });

        console.log(nodemailer.getTestMessageUrl(message))

        return {
            tripId: trip.id
        }
    })
}