import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

const s3 = new S3Client({ region: process.env.REGION });
const BUCKET_NAME = process.env.BUCKET_NAME as string;

const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

export class S3Service {
  async uploadToS3(file: Express.Multer.File, invoiceId: string) {
    // Garante que o nome do arquivo tenha a extensão correta
    const fileName = `${invoiceId}.pdf`;  // Usando o id da fatura como nome do arquivo
  
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: 'application/pdf', 
    };
  
    const command = new PutObjectCommand(params);
    await s3.send(command);
  }  

  async downloadFromS3(fileKey: string): Promise<Buffer | null> {
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
    };

    try {
      const command = new GetObjectCommand(params);
      const data = await s3.send(command);

      if (data.Body && data.Body instanceof Readable) {
        return await streamToBuffer(data.Body);
      } else {
        throw new Error('Invalid stream type returned from S3');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('NoSuchKey')) {
        // Se o erro for relacionado ao arquivo não encontrado
        console.error(`Arquivo não encontrado: ${fileKey}`);
      } else {
        console.error('Erro ao tentar baixar o arquivo do S3:', error);
      }
      return null;
    }
  }
}