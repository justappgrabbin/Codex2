import { type FileNode } from './fileSystem';

export interface GANTemplate {
  id: string;
  title: string;
  description: string;
  tags: string[];
  pretrained: boolean;
  files: FileNode[];
}

export const GAN_TEMPLATES: GANTemplate[] = [
  {
    id: 'simple-gan',
    title: 'Simple GAN',
    description: 'Basic GAN implementation with TensorFlow.js - perfect for learning',
    tags: ['Basic', 'TensorFlow.js', 'Trainable'],
    pretrained: false,
    files: [
      {
        name: 'index.html',
        type: 'file',
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple GAN Trainer</title>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"></script>
  <link rel="stylesheet" href="src/styles.css">
</head>
<body>
  <div class="container">
    <h1>🧠 Simple GAN Trainer</h1>
    <p class="subtitle">Generative Adversarial Network</p>
    
    <div class="controls">
      <button id="trainBtn" onclick="train()">Start Training</button>
      <button id="generateBtn" onclick="generate()">Generate Sample</button>
      <button id="stopBtn" onclick="stop()">Stop</button>
    </div>
    
    <div class="stats">
      <div class="stat">
        <label>Epoch:</label>
        <span id="epoch">0</span>
      </div>
      <div class="stat">
        <label>Generator Loss:</label>
        <span id="gLoss">-</span>
      </div>
      <div class="stat">
        <label>Discriminator Loss:</label>
        <span id="dLoss">-</span>
      </div>
    </div>
    
    <canvas id="canvas"></canvas>
    
    <div class="info">
      <h3>About this GAN</h3>
      <p>This is a simple Generative Adversarial Network that learns to generate random data patterns.</p>
      <p><strong>Generator</strong> creates fake samples | <strong>Discriminator</strong> tries to detect fakes</p>
    </div>
  </div>
  
  <script src="src/gan.js"></script>
</body>
</html>`
      },
      {
        name: 'src',
        type: 'folder',
        path: 'src',
        children: [
          {
            name: 'gan.js',
            type: 'file',
            path: 'src/gan.js',
            content: `let generator, discriminator;
let isTraining = false;
let currentEpoch = 0;

const LATENT_DIM = 10;
const DATA_DIM = 2;

function createGenerator() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [LATENT_DIM] }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: DATA_DIM }));
  return model;
}

function createDiscriminator() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [DATA_DIM] }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  return model;
}

function generateRealData(numSamples) {
  return tf.tidy(() => {
    const x = tf.randomNormal([numSamples, 1]);
    const y = tf.add(tf.mul(x, 2), tf.randomNormal([numSamples, 1], 0, 0.1));
    return tf.concat([x, y], 1);
  });
}

function generateNoise(numSamples) {
  return tf.randomNormal([numSamples, LATENT_DIM]);
}

async function train() {
  if (!generator) {
    generator = createGenerator();
    discriminator = createDiscriminator();
    discriminator.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy'
    });
  }
  
  isTraining = true;
  document.getElementById('trainBtn').disabled = true;
  
  const batchSize = 32;
  const numEpochs = 1000;
  
  for (let epoch = 0; epoch < numEpochs && isTraining; epoch++) {
    currentEpoch = epoch;
    
    const realData = generateRealData(batchSize);
    const noise = generateNoise(batchSize);
    const fakeData = generator.predict(noise);
    
    const dLossReal = await discriminator.trainOnBatch(
      realData,
      tf.ones([batchSize, 1])
    );
    
    const dLossFake = await discriminator.trainOnBatch(
      fakeData,
      tf.zeros([batchSize, 1])
    );
    
    const combinedModel = tf.sequential();
    combinedModel.add(generator);
    combinedModel.add(discriminator);
    discriminator.trainable = false;
    combinedModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy'
    });
    
    const newNoise = generateNoise(batchSize);
    const gLoss = await combinedModel.trainOnBatch(
      newNoise,
      tf.ones([batchSize, 1])
    );
    
    discriminator.trainable = true;
    
    if (epoch % 10 === 0) {
      document.getElementById('epoch').textContent = epoch;
      document.getElementById('gLoss').textContent = gLoss.toFixed(4);
      document.getElementById('dLoss').textContent = ((dLossReal + dLossFake) / 2).toFixed(4);
      await visualize();
    }
    
    await tf.nextFrame();
    
    tf.dispose([realData, noise, fakeData]);
  }
  
  document.getElementById('trainBtn').disabled = false;
  isTraining = false;
}

async function generate() {
  if (!generator) {
    alert('Train the GAN first!');
    return;
  }
  await visualize();
}

async function visualize() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const noise = generateNoise(200);
  const generated = await generator.predict(noise).array();
  
  ctx.fillStyle = '#9b87f5';
  generated.forEach(([x, y]) => {
    const px = (x + 3) * (canvas.width / 6);
    const py = (y + 6) * (canvas.height / 12);
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
  noise.dispose();
}

function stop() {
  isTraining = false;
}

window.train = train;
window.generate = generate;
window.stop = stop;`
          },
          {
            name: 'styles.css',
            type: 'file',
            path: 'src/styles.css',
            content: `body {
  margin: 0;
  padding: 20px;
  font-family: 'Inter', -apple-system, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  min-height: 100vh;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  color: #9b87f5;
  margin-bottom: 5px;
}

.subtitle {
  text-align: center;
  color: #9b87f5;
  opacity: 0.7;
  margin-top: 0;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 30px 0;
}

button {
  padding: 12px 24px;
  background: #9b87f5;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

button:hover:not(:disabled) {
  background: #8b77e5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(155, 135, 245, 0.4);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin: 20px 0;
  flex-wrap: wrap;
}

.stat {
  background: rgba(155, 135, 245, 0.1);
  padding: 15px 25px;
  border-radius: 8px;
  border: 1px solid rgba(155, 135, 245, 0.3);
}

.stat label {
  display: block;
  font-size: 12px;
  color: #9b87f5;
  margin-bottom: 5px;
}

.stat span {
  font-size: 20px;
  font-weight: bold;
}

#canvas {
  display: block;
  width: 100%;
  max-width: 600px;
  height: 400px;
  margin: 20px auto;
  border: 2px solid #9b87f5;
  border-radius: 12px;
  background: #0a0a1a;
  box-shadow: 0 0 30px rgba(155, 135, 245, 0.3);
}

.info {
  margin-top: 40px;
  padding: 20px;
  background: rgba(155, 135, 245, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(155, 135, 245, 0.2);
}

.info h3 {
  color: #9b87f5;
  margin-top: 0;
}

.info p {
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
}`
          }
        ]
      }
    ]
  }
];
