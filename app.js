// Configuración de Estilos de Mapa (CartoDB Dark Matter)
const map = L.map('map', { zoomControl: false }).setView([-16.4957, -68.1335], 14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

// Rutas de ejemplo (Coordenadas reales aproximadas de La Paz)
const rutasOficiales = {
    'l212': {
        color: '#00f2fe',
        coords: [
            [-16.5411, -68.0624], [-16.5250, -68.0950], [-16.5000, -68.1200], [-16.4957, -68.1335]
        ]
    }
};

let userMarker, rutaActivaLine, userPathLine;
let puntosRecorridos = [];
let isTracking = false;

// Al cargar, ocultamos el loader
window.onload = () => document.getElementById('loader').classList.add('fade-out');

// Iniciar/Detener Control
document.getElementById('btn-main').addEventListener('click', function() {
    isTracking = !isTracking;
    this.classList.toggle('stop');
    const reportBtn = document.getElementById('btn-report');
    
    if(isTracking) {
        this.innerHTML = `<span class="material-icons-round">stop</span> DETENER`;
        reportBtn.classList.remove('hidden');
        iniciarSeguimientoReal();
    } else {
        location.reload(); // Reinicia para un nuevo viaje
    }
});

function iniciarSeguimientoReal() {
    const selectedLine = document.getElementById('linea-select').value;
    
    // Dibujar Ruta Oficial si se selecciona una
    if(rutasOficiales[selectedLine]) {
        rutaActivaLine = L.polyline(rutasOficiales[selectedLine].coords, {
            color: rutasOficiales[selectedLine].color,
            weight: 8,
            opacity: 0.4
        }).addTo(map);
    }

    navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords;
        const currentPos = [latitude, longitude];

        // Actualizar Marcador con efecto de pulsación
        if (!userMarker) {
            userMarker = L.circleMarker(currentPos, {
                radius: 10, color: '#fff', fillColor: '#3498db', fillOpacity: 1, weight: 3
            }).addTo(map);
        } else {
            userMarker.setLatLng(currentPos);
        }

        // Trazar el camino que el usuario REALMENTE está siguiendo
        puntosRecorridos.push(currentPos);
        if (userPathLine) map.removeLayer(userPathLine);
        userPathLine = L.polyline(puntosRecorridos, {color: '#fff', weight: 3, dashArray: '5, 10'}).addTo(map);

        map.flyTo(currentPos, 16);
        
        // CÁLCULO DE DESVÍO (Lógica para detectar Trameaje)
        if(rutaActivaLine) {
            const distancia = calcularDistanciaARuta(currentPos, rutasOficiales[selectedLine].coords);
            document.getElementById('txt-desvio').innerText = `${Math.round(distancia)} m`;
            
            if(distancia > 200) { // Si se desvía más de 200 metros
                document.getElementById('txt-desvio').style.color = "#ff4757";
            }
        }
    }, null, { enableHighAccuracy: true });
}

// Función matemática para calcular qué tan lejos está el usuario de la línea oficial
function calcularDistanciaARuta(punto, ruta) {
    // Aquí iría una función de "Point to Line distance"
    // Por ahora simulamos un valor aleatorio para ver el cambio en el UI
    return Math.random() * 300; 
}

// Configuración de Supabase (Saca estos datos de tu panel de Supabase -> Project Settings -> API)
const SUPABASE_URL = 'https://jlnbrxijifasgvmudinj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_R842HE5-jzVXQGgLC5h5mA_C3ydRh7x';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function enviarDenuncia() {
    const placa = document.getElementById('placa').value;
    const linea = document.getElementById('linea-select').value;
    const desvio = document.getElementById('txt-desvio').innerText;

    // Obtenemos la última posición GPS guardada en nuestro rastreo
    const ultimaPos = puntosRecorridos[puntosRecorridos.length - 1];

    if (!placa || !ultimaPos) {
        alert("Por favor, ingresa la placa e inicia el viaje.");
        return;
    }

    const { data, error } = await supabase
        .from('denuncias_transporte')
        .insert([
            { 
                placa_vehiculo: placa, 
                linea_transporte: linea,
                latitud: ultimaPos[0],
                longitud: ultimaPos[1],
                desvio_metros: parseFloat(desvio),
                // Formato PostGIS para el punto geográfico
                ubicacion_geog: `POINT(${ultimaPos[1]} ${ultimaPos[0]})`
            }
        ]);

    if (error) {
        console.error("Error guardando:", error);
        alert("Hubo un error al enviar la denuncia.");
    } else {
        alert("¡Denuncia enviada con éxito! Gracias por ayudar a controlar el trameaje.");
    }
}

// Asignar el evento al botón de reportar
document.getElementById('btn-report').addEventListener('click', enviarDenuncia);