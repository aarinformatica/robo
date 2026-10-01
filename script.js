// Configuração Inicial da Cena, Câmera e Renderizador
const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b0f19, 0.05);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Luzes
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 8, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0x00f3ff, 2, 10);
pointLight.position.set(0, 1.5, 2);
scene.add(pointLight);

// Materiais
const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1e2430, 
    metalness: 0.8, 
    roughness: 0.2 
});

const accentMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x00f3ff, 
    emissive: 0x00f3ff,
    emissiveIntensity: 0.5,
    metalness: 0.9, 
    roughness: 0.1 
});

const darkMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0f131a, 
    metalness: 0.5, 
    roughness: 0.8 
});

// Construção do Personagem (Robô)
const characterGroup = new THREE.Group();
scene.add(characterGroup);

// Torso
const torsoGeometry = new THREE.BoxGeometry(1.2, 1.4, 0.8);
const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
torso.position.y = 0.5;
torso.castShadow = true;
torso.receiveShadow = true;
characterGroup.add(torso);

// Detalhe luminoso no peito
const coreGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32);
const core = new THREE.Mesh(coreGeometry, accentMaterial);
core.rotation.x = Math.PI / 2;
core.position.set(0, 0.5, 0.41);
characterGroup.add(core);

// Pescoço
const neckGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16);
const neck = new THREE.Mesh(neckGeometry, darkMaterial);
neck.position.y = 1.35;
characterGroup.add(neck);

// Cabeça
const headGroup = new THREE.Group();
headGroup.position.y = 1.6;
characterGroup.add(headGroup);

const headGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
const head = new THREE.Mesh(headGeometry, bodyMaterial);
head.castShadow = true;
headGroup.add(head);

// Visor / Olhos
const visorGeometry = new THREE.BoxGeometry(0.7, 0.3, 0.2);
const visor = new THREE.Mesh(visorGeometry, accentMaterial);
visor.position.set(0, 0, 0.4);
headGroup.add(visor);

// Antena
const antennaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.3, 16), darkMaterial);
antennaBase.position.set(0, 0.6, 0);
headGroup.add(antennaBase);

const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), accentMaterial);
antennaTip.position.set(0, 0.8, 0);
headGroup.add(antennaTip);

// Braços
const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16);

const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
leftArm.position.set(-0.8, 0.4, 0);
leftArm.rotation.z = -0.2;
leftArm.castShadow = true;
characterGroup.add(leftArm);

const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
rightArm.position.set(0.8, 0.4, 0);
rightArm.rotation.z = 0.2;
rightArm.castShadow = true;
characterGroup.add(rightArm);

// Base / Chão
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x05070c, 
    roughness: 0.9,
    metalness: 0.1 
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.8;
floor.receiveShadow = true;
scene.add(floor);

// Variáveis de Controle e Seletores do seu HTML
const uiParagraph = document.querySelector('.ui-overlay p');
let analyser, dataArray;
let audioInitialized = false;
let recognition;
let isRobotSpeaking = false;

// 🔑 COLE SUA CHAVE DO GROQCLOUD AQUI
const GROQ_API_KEY = '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'; 

// Inicialização de Áudio e Reconhecimento de Voz por Microfone
function initAudioAndSpeech() {
    if (audioInitialized) return;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(stream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            audioInitialized = true;
        })
        .catch((err) => {
            console.error("Erro ao acessar microfone:", err);
        });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            if (uiParagraph && !isRobotSpeaking) {
                uiParagraph.innerHTML = "<b>[Ouvindo... Pode falar com o Cyber-01!]</b>";
            }
        };

        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript.trim();
            console.log("Você disse:", speechResult);
            if (uiParagraph) uiParagraph.innerHTML = `<b>Você:</b> "${speechResult}"`;
            
            perguntarAoGroq(speechResult);
        };

        recognition.onerror = (event) => {
            console.error("Erro no reconhecimento:", event.error);
        };

        recognition.onend = () => {
            if (!isRobotSpeaking) {
                try { recognition.start(); } catch(e) {}
            }
        };

        try { recognition.start(); } catch(e) {}
    } else {
        if (uiParagraph) uiParagraph.innerHTML = "Seu navegador não suporta reconhecimento de voz. Use o Google Chrome.";
    }
}

// Comunicação com a API do GroqCloud (Usando modelo compatível)
async function perguntarAoGroq(pergunta) {
    if (GROQ_API_KEY === 'SUA_CHAVE_DO_GROQ_AQUI') {
        falarTexto("Por favor, insira sua chave da Groq no arquivo script.js.");
        return;
    }

    if (uiParagraph) uiParagraph.innerHTML = `<b>Cyber-01:</b> Pensando...`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "Você é o Cyber-01, um assistente robô futurista em 3D. Responda de forma direta, concisa (máximo de duas frases curtas), com tom robótico/amigável e sempre em português do Brasil."
                    },
                    {
                        role: "user",
                        content: pergunta
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("DETALHE DO ERRO DA API GROQ:", responseData);
            falarTexto(`Erro da API: ${responseData.error?.message || 'Falha desconhecida'}`);
            return;
        }

        const respostaTexto = responseData.choices?.[0]?.message?.content;

        if (respostaTexto) {
            falarTexto(respostaTexto.trim());
        } else {
            falarTexto("Não recebi dados válidos.");
        }

    } catch (error) {
        console.error("ERRO CRÍTICO DE REDE / CORS:", error);
        falarTexto("Erro de conexão com os servidores.");
    }
}

// Síntese de Voz (O Robô fala o texto de resposta)
function falarTexto(texto) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 0.75; 

    utterance.onstart = () => {
        isRobotSpeaking = true;
        if (recognition) { try { recognition.stop(); } catch(e) {} }
        if (uiParagraph) uiParagraph.innerHTML = `<b>Cyber-01:</b> "${texto}"`;
    };

    utterance.onend = () => {
        isRobotSpeaking = false;
        setTimeout(() => {
            try { recognition.start(); } catch(e) {}
        }, 500);
    };

    window.speechSynthesis.speak(utterance);
}

// Ativação do microfone por clique na tela
window.addEventListener('click', initAudioAndSpeech, { once: true });
if(uiParagraph) {
    uiParagraph.innerHTML += "<br><span style='font-size:12px; color:#00f3ff;'>(Clique em qualquer lugar da tela para ativar o microfone)</span>";
}

// Mouse tracking para movimento da cabeça
let mouseX = 0;
let mouseY = 0;
let targetRotationX = 0;
let targetRotationY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Redimensionamento de tela
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loop de Animação do Three.js
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    let audioVolume = 0;
    if (audioInitialized && analyser) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        audioVolume = (sum / dataArray.length) / 255;
    }

    let speakingEffect = 0;
    if (isRobotSpeaking) {
        speakingEffect = Math.sin(elapsedTime * 22) * 0.5 + 0.5;
    }

    characterGroup.position.y = Math.sin(elapsedTime * 2) * 0.08 + (audioVolume * 0.3) + (speakingEffect * 0.05);
    
    accentMaterial.emissiveIntensity = 0.5 + (audioVolume * 3.5) + (speakingEffect * 3.0);
    pointLight.intensity = 2 + (audioVolume * 5) + (speakingEffect * 3.5);

    leftArm.rotation.z = -0.2 + Math.sin(elapsedTime * 1.5) * 0.05 - (audioVolume * 0.2) - (speakingEffect * 0.15);
    rightArm.rotation.z = 0.2 - Math.sin(elapsedTime * 1.5) * 0.05 + (audioVolume * 0.2) + (speakingEffect * 0.15);

    targetRotationY = mouseX * 0.8;
    targetRotationX = -mouseY * 0.5;

    headGroup.rotation.y += (targetRotationY - headGroup.rotation.y) * 0.1;
    headGroup.rotation.x += (targetRotationX + (audioVolume * 0.2) + (speakingEffect * 0.1) - headGroup.rotation.x) * 0.1;

    characterGroup.rotation.y += (targetRotationY * 0.3 - characterGroup.rotation.y) * 0.05;

    renderer.render(scene, camera);
}

animate();
