import nodemailer from "nodemailer" 
import dotenv from 'dotenv' 
dotenv.config()
const config = ()=>{   
    return {
    host: process.env.SMTP_HOST,
    port: +process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
  }
    
} 
}
export const  transporter = nodemailer.createTransport(config());

// transport.sendMail({
//   from: "Private Person <from@example.com>",
//   to: "A Test User <to@example.com>",
//   subject: "Hello from Mailtrap",
//   text: "This is a test e-mail message."
// }, (error, info) => {
//   if (error) {
//     return console.log(error);
//   }
//   console.log("Message sent: %s", info.messageId);
// });