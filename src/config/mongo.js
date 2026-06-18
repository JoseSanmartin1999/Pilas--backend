import dns from 'node:dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectMongo = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            throw new Error('MONGO_URI no esta definida');
        }

        if (mongoUri.startsWith('mongodb+srv://')) {
            const dnsServers = (process.env.MONGO_DNS_SERVERS || '8.8.8.8,1.1.1.1')
                .split(',')
                .map((server) => server.trim())
                .filter(Boolean);

            if (dnsServers.length > 0) {
                dns.setServers(dnsServers);
            }
        }

        await mongoose.connect(mongoUri);
        console.log('Conectado exitosamente a MongoDB (Chat)');
    } catch (error) {
        console.error('Error conectando a MongoDB:', error.message);
        process.exit(1);
    }
};

export default connectMongo;
