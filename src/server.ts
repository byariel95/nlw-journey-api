import fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import cors from '@fastify/cors'
import { createTrip } from './routes/create-trip';

const app = fastify();

app.register(cors,{
    origin:'*',
    
})
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(createTrip);

app.listen({port : 3000}).then(()=>{
    console.log('Server Running')
})