const AWS = require('aws-sdk');
require('dotenv').config({
    path: `${__dirname}/.env`})

const  uploadToS3 = (data, filename) => {
    console.log(typeof process.env.BUCKET_NAME)
    const BUCKET_NAME = process.env.BUCKET_NAME;
    const IAM_USER_KEY = process.env.IAM_USER_KEY;
    const IAM_USER_SECRET = process.env.IAM_USER_SECRET;
    let s3bucket = new AWS.S3({
        accessKeyId: IAM_USER_KEY,
        secretAccessKey: IAM_USER_SECRET,
    })

    var params = {
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: data,
        ACL: 'public-read'
    }
    return new Promise((resolve, reject) => {
        s3bucket.upload(params, (err, s3response) => {
            if (err) {
                console.log('Something went wrong', err);
                reject(err)
            } else {
                console.log(s3response)
                resolve(s3response);
            }
        })
    })
    
}

module.exports = {
    uploadToS3
}