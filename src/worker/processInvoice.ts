import { SQSService } from '../services/sqsService';

async function processInvoices() {
  const sqsService = new SQSService();

  setInterval(async () => {
    await sqsService.receiveMessage();
  }, 10000); 
}

processInvoices();
