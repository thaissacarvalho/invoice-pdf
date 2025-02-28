import { Request, Response } from 'express';
import { extractDataFromPDF } from '../utils/pdfParser';
import { SQSService } from '../services/sqsService';
import { DynamoService } from '../services/dynamoService';
import { S3Service } from '../services/s3Service';

export class InvoiceController {
  private s3Service: S3Service;
  private sqsService: SQSService;
  private dynamoService: DynamoService;

  constructor() {
    this.s3Service = new S3Service();
    this.sqsService = new SQSService();
    this.dynamoService = new DynamoService();
  }

  async uploadInvoice(req: Request, res: Response): Promise<void> {
    try {
      console.log('Arquivo recebido:', req.file);  
  
      const file = req.file;
      if (!file) {
        return void res.status(400).send('No file uploaded');
      }
  
      // Extrai os dados e obtém o invoiceId gerado
      const extractedData = await extractDataFromPDF(file.buffer);
      console.log('Dados extraídos:', extractedData);
  
      // Agora passamos o invoiceId gerado ao fazer o upload
      await this.s3Service.uploadToS3(file, extractedData.id);
  
      // Salva os dados no DynamoDB
      const savedItem = await this.dynamoService.saveToDynamoDB(extractedData);
  
      // Envia para o SQS (se necessário)
      await this.sqsService.sendMessage(JSON.stringify(extractedData));
  
      return void res.status(201).json(savedItem);
    } catch (error) {
      console.error('Error in uploadInvoice:', error);
      return void res.status(500).send('Error processing file');
    }
  }   

  async getInvoice(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const item = await this.dynamoService.getFromDynamoDB(id);

      if (!item) return void res.status(404).send('Invoice not found');
      return void res.json(item);
    } catch (error) {
      console.error(error);
      return void res.status(500).send('Error fetching invoice');
    }
  };

  async downloadInvoice(req: Request, res: Response): Promise<void> {
    try {
      const invoiceId = req.params.id;
  
      const fileKey = `${invoiceId}.pdf`; 
  
      const file = await this.s3Service.downloadFromS3(fileKey);
  
      if (!file) {
        return void res.status(404).json({ message: 'Invoice not found' });
      }
  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileKey}`);
      res.send(file);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error processing download' });
    }
  }
}