const googleTTS = require('google-tts-api');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.set('view engine', 'pug');
app.set('views', './views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

app.use(express.static(publicDir));

app.get('/', async (req, res) => {
    const audioUrl = req.query.audioUrl;
    if (audioUrl) {
        const response = await axios.get(audioUrl);
        const pathToFile = path.join(__dirname, 'public', 'audio.mp3');
        const writer = fs.createWriteStream(pathToFile);
        response.data.pipe(writer);
        writer.on('finish', () => {
            res.render('index', { audioUrl: './audio.mp3' });
        });
    } else {
        res.render('index');
    }
});

app.get('/audio', async (req, res) => {
    const id = req.query.id;
    const inputText = req.query.text;

    try {
        if (!inputText) {
            return res.status(400).send('Text parameter is missing.');
        }

        const data = await googleTTS.getAllAudioBase64(inputText, {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
            splitPunct: ',.?',
        });

        const combinedBase64 = data.reduce((accumulator, current) => {
            return accumulator + (current?.base64 || '');
        }, '');

        const fileName = id+'.mp3' || 'audio.mp3';

        // Save the audio data to a file
        const filePath = path.join(__dirname+'/audio/', fileName);
        await fs.writeFile(filePath, Buffer.from(combinedBase64, 'base64'));

        // Set headers to force download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        // Send the file as a response
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error generating or serving audio:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/audiobase64', (req, res) => {
    const inputText = req.body.name;
    var characterCount = inputText.length;
    googleTTS
        .getAllAudioBase64(inputText, {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
            splitPunct: ',.?',
        })
        .then(data => {
            let combinedBase64 = data.reduce((accumulator, current) => {
                return accumulator + (current?.base64 || '');
            }, '');

            // var audiobase64 = "data:audio/mpeg;base64," + data[0]?.base64 +  data[1]?.base64;
            var audiobase64 = "data:audio/mpeg;base64," + combinedBase64;

            res.render('index', { audiobase64: audiobase64 , characterCount: characterCount});
        })
        .catch(console.error);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
