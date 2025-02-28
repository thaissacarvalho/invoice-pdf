import express from 'express';
import invoiceRoutes from './routes/invoiceRoutes';

const app = express();
app.use(express.json());

app.use('/invoices', invoiceRoutes);

export default app;
