import { createRouter } from "next-connect";
import multer from 'multer';
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-pro-vision';

const upload = multer({
  storage: multer.memoryStorage(),
});

const router = createRouter();

router.use(upload.single('image'));

router.all((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

router.post(async (req, res) => {
  console.log('req.file:', req.file); // 添加日志
  try {
    console.log('Starting request...');
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 1,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    if (!req.file) {
      console.log('No file uploaded.'); // 添加日志
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const parts = [
      {
        text: 'You are a skilled pet language translator, able to translate the cat\'s or dog\'s voice through the user\'s uploaded pet pictures. Accurately guess the pet\'s emotions and thoughts through the content of the user\'s uploaded pet pictures. You can guess what the pet wants to say based on the pet\'s body language, expressions, and surrounding environment. After interpreting, please give the pet\'s "voice" according to the pet\'s tone, a bit more natural spoken language, answer in Chinese, the format is as follows: 🐱: [<What the cat thinks>] or 🐶: [<What the dog thinks>]. In the user\'s uploaded picture, if there is no pet, then return "图片中没有发现毛孩子~"'
      },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: req.file.buffer.toString('base64'),
        },
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig,
      safetySettings,
    });

    if (!result) {
      console.log('No result from generateContent.'); // 添加日志
    } else {
      console.log('Result from generateContent:', result); // 添加日志
    }

    const responseText = result.response.text();
    res.status(200).json({ result: responseText });
  } catch (error) {
    console.error('Error during request:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } finally {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
});

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default router.handler();