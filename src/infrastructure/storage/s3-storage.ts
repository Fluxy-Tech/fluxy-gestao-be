import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "./s3-client";

export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
            ACL: "public-read",
        }),
    );
    return `${process.env.UPLOAD_PUBLIC_BASE_URL}/${key}`;
}

// Arquivos privados (anexos de tickets): sem ACL pública — só são lidos pelo backend, que
// confere quem está pedindo antes de devolver o conteúdo.
export async function uploadPrivateToS3(key: string, body: Buffer, contentType: string): Promise<void> {
    await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function getS3Object(key: string) {
    const out = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return out.Body as NodeJS.ReadableStream;
}

export async function deleteFromS3(keys: string[]): Promise<void> {
    for (const key of keys) {
        try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
        } catch (err) {
            console.error(`[storage] falha ao apagar ${key}:`, (err as Error).message);
        }
    }
}
