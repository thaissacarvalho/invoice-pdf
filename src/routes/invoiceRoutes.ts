import { Router } from 'express';
import multer from 'multer';
import { InvoiceController } from '../controllers/invoiceController';

const invoiceController = new InvoiceController();

const router = Router();

const upload = multer();

router.post('/upload', upload.single('file'), invoiceController.uploadInvoice.bind(invoiceController));
router.get('/:id', invoiceController.getInvoice.bind(invoiceController));
router.get('/download/:id', invoiceController.downloadInvoice.bind(invoiceController));

export default router;