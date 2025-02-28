import request from 'supertest';
import express from 'express';
import multer from 'multer';
import { InvoiceController } from '../src/controllers/invoiceController';
import * as pdfParser from '../src/utils/pdfParser';
import { S3Service } from '../src/services/s3Service';
import { SQSService } from '../src/services/sqsService';
import { DynamoService } from '../src/services/dynamoService';

jest.mock('../src/services/s3Service');
jest.mock('../src/services/sqsService');
jest.mock('../src/services/dynamoService');

jest.spyOn(pdfParser, 'extractDataFromPDF').mockResolvedValue({
  id: '12345',
  numeroInstalacao: '9876543210-1',
  endereco: 'Rua Exemplo, 12345678',
  dataReferencia: '01/2024',
  datasLeitura: { anterior: '01/01/2024', atual: '31/01/2024' },
  totalPagar: '100.00',
  itemsInvoice: ['Item 1', 'Item 2'],
  extraidoEm: new Date().toISOString(),
});

jest.spyOn(S3Service.prototype, 'uploadToS3').mockResolvedValue();
jest.spyOn(SQSService.prototype, 'sendMessage').mockResolvedValue();
jest.spyOn(DynamoService.prototype, 'saveToDynamoDB').mockResolvedValue({
  id: '12345',
  numeroInstalacao: '9876543210-1',
  endereco: 'Rua Exemplo, 12345678',
  dataReferencia: '01/2024',
  datasLeitura: { anterior: '01/01/2024', atual: '31/01/2024' },
  totalPagar: '100.00',
  itemsInvoice: ['Item 1', 'Item 2'],
  extraidoEm: new Date().toISOString(),
});
jest.spyOn(DynamoService.prototype, 'getFromDynamoDB').mockResolvedValue({
  id: '12345',
  numeroInstalacao: '9876543210-1',
  endereco: 'Rua Exemplo, 12345678',
  dataReferencia: '01/2024',
  datasLeitura: { anterior: '01/01/2024', atual: '31/01/2024' },
  totalPagar: '100.00',
  itemsInvoice: ['Item 1', 'Item 2'],
  extraidoEm: new Date().toISOString(),
});
jest.spyOn(S3Service.prototype, 'downloadFromS3').mockResolvedValue(Buffer.from('file content'));

const app = express();
const upload = multer();
const invoiceController = new InvoiceController();

app.post('/upload', upload.single('file'), invoiceController.uploadInvoice.bind(invoiceController));
app.get('/:id', invoiceController.getInvoice.bind(invoiceController));
app.get('/download/:id', invoiceController.downloadInvoice.bind(invoiceController));

describe('InvoiceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upload an invoice successfully', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('test file content'), { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ id: '12345', totalPagar: '100.00' }));
    expect(S3Service.prototype.uploadToS3).toHaveBeenCalled();
    expect(DynamoService.prototype.saveToDynamoDB).toHaveBeenCalledWith(expect.objectContaining({ id: '12345' }));
    expect(SQSService.prototype.sendMessage).toHaveBeenCalled();
  });

  it('should return 400 if no file is uploaded', async () => {
    const response = await request(app).post('/upload');
    expect(response.status).toBe(400);
    expect(response.text).toBe('No file uploaded');
  });

  it('should return an invoice by id', async () => {
    const response = await request(app).get('/12345');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ id: '12345', totalPagar: '100.00' }));
    expect(DynamoService.prototype.getFromDynamoDB).toHaveBeenCalledWith('12345');
  });

  it('should return 404 if invoice not found', async () => {
    jest.spyOn(DynamoService.prototype, 'getFromDynamoDB').mockResolvedValue(null);

    const response = await request(app).get('/99999');

    expect(response.status).toBe(404);
    expect(response.text).toBe('Invoice not found');
  });

  it('should download an invoice file', async () => {
    const response = await request(app).get('/download/12345');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment; filename=12345.pdf');
    expect(S3Service.prototype.downloadFromS3).toHaveBeenCalledWith('12345.pdf');
  });

  it('should return 404 if invoice file not found', async () => {
    jest.spyOn(S3Service.prototype, 'downloadFromS3').mockResolvedValue(null);

    const response = await request(app).get('/download/99999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Invoice not found' });
  });
});