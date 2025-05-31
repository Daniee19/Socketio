// server.js
//Modulo http permite crear un servidor web básico
const http = require('node:http');
const { Server } = require('socket.io'); //Librería socket.io para comunicación en tiempo real al servidor
const fs = require('node:fs'); //Leer y escribir archivos
const path = require("node:path"); //Unir y resolver rutas de archivos
const url = require("node:url"); //Extraer partes del url
const cloudinary = require('cloudinary').v2; //Subir imágenes desde el backend a Cloudinary y obtener una URL pública.
const formidable = require('formidable'); //Procesar formularios con archivos

// Configuracion de cloudinary
cloudinary.config({
  cloud_name: 'dbevz4yds',
  api_key: '777967584718464',
  api_secret: 'ha6pyCh7sLx3SwwZYymRY062sAg'
});

//Se crea un servidor http
//Conforme se ingrese a los archivos se va obteniendo su url... por medio del req.url
const server = http.createServer((req, res) => {
  //Quitar los datos vinculados de las url solo para ser leidos

  let parsedUrl = url.parse(req.url).pathname; //Se obtiene la ruta sin parámetros

  if (req.method === 'OPTIONS') { //Es necesario para que las peticiones fetch no sean bloqueadas, debido al CORS
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*', //Permitir el acceso desde cualquier dominio
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', //Usar esos métodos
      'Access-Control-Allow-Headers': 'Content-Type' //Permitir cabeceras personalizadas
    });
    res.end();
    return;
  }

  if (req.method === "POST") {

    const form = new formidable.IncomingForm();

    //Se encarga de leer y procesar lo enviado por el formulario
    //El form.parse hace que files tenga un formato diferente para la información del archivo
    form.parse(req, async (err, fields, files) => {
      console.log('Archivos recibidos:', files); //Imagen de inicio (avatar) //Archivos PDF, imagen, etc
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to parse form data.' }));
        return;
      }
      //RECIBIR LA PETICIÓN DEL FETCH QUE ENVÍA IMÁGENES
      if (parsedUrl === "/api/upload-image") {
        const avatarFile = files.avatar;
        console.log("El avatar file es:", avatarFile);
        if (!avatarFile) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No avatar file provided.' }));
          return;
        }

        const avatarPath = Array.isArray(avatarFile) ? avatarFile[0].filepath : avatarFile.filepath;
        console.log("El avatarPath es: ", avatarPath); //Ruta temporal del dispositivo
        try {
          // Carga el archivo en un url utilizando cloudinary
          const uploadResult = await cloudinary.uploader.upload(avatarPath, {
            folder: 'chat-avatars',
            resource_type: 'image'
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ url: uploadResult.secure_url }));
        } catch (uploadError) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to upload image to Cloudinary.' }));
        }

      } else if (parsedUrl === "/api/upload-file") {
        //Se recibe el archivo
        let archivoRecibido = files.archivo;

        if (!archivoRecibido) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No file provided.' }));
          return;
        }
        //Obtenemos la ruta temporal del archivo a subir
        const filePath = Array.isArray(archivoRecibido) ? archivoRecibido[0].filepath : archivoRecibido.filepath; //ruta local

        //Para que valide imagenes, videos, archivos genéricos (nombre del archivo con su extensión)
        const filename = archivoRecibido[0].originalFilename.toLowerCase(); // nombre archivo en minúsculas para evitar problemas con mayúsculas
        let resourceType = 'raw';

        //ResourceType es para que se reconozca lo que se va a subir a Cloudinary
        if (filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.png') || filename.endsWith('.gif')) {
          resourceType = 'image';
        } else if (filename.endsWith('.mp4') || filename.endsWith('.avi') || filename.endsWith('.mov')) {
          resourceType = 'video';
        } else if (filename.endsWith('.pdf') || filename.endsWith('.doc') || filename.endsWith('.docx') || filename.endsWith('.txt')) {
          resourceType = 'raw';
        }

        try {
          //Se subirá a cloudinary -> Se obtendrá la url del archivo
          const uploadResult = await cloudinary.uploader.upload(filePath, {
            folder: 'chat-files', //Se crea una carpeta chat-files en cloudinary
            resource_type: resourceType, //Se agrega el recurso
            public_id: filename //nombre personalizado en la url
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          //Se envía la url del archivo de regreso
          res.end(JSON.stringify({
            url: uploadResult.secure_url,
            extension: resourceType,
          }));
        } catch (uploadError) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to upload image to Cloudinary.' }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found.' }));
      }
      return;
    })
    return;
  }

  //Va a recorrer cada identificador de archivo (MIME Type)
  let filePath = `.${parsedUrl}`; //La ruta actual será filePath
  if (filePath === "./") {
    filePath = "./usuario.html";
  }
  console.log("El filtePath es:", filePath);

  //Obtener la extensión del archivo
  const ext = path.extname(filePath).toLowerCase();
  console.log("El ext es: ", ext);
  //Tipos MIMES básicos
  //Sirve para indicar al navegador con que extensiones se debe de trabajar
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  //Leer la ruta y devolver ese archivo para que el navegador lo muestre
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Archivo no encontrado');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}); //Fin de la creación del servidor NodeJS

//Configurar Socket
const io = new Server(server); //El servidor creado de node.js se va a conectar con Socket.io

const usuariosConectados = new Map();

io.on('connection', socket => {
  console.log('Un usuario se conectó:', socket.id);

  socket.on('archivo', data => {

    io.emit('archivo', {
      url: data.url,
      extension: data.extension,
      nombre: data.nombre
    });
  });

  socket.on('registrar usuario', (nombre) => {
    console.log(`${nombre} se ha registrado`);
    usuariosConectados.set(socket.id, nombre); // Guardamos el nombre por socket.id
    io.emit('usuario conectado', `${nombre} se ha conectado`);
  });

  // Escuchamos el evento 'chat message', que funciona como una "clave" o "canal"
  socket.on('chat message', msg => {
    console.log('Mensaje recibido:', msg);
    // Reenviamos el mensaje recibido a todos los usuarios conectados en ese canal
    io.emit('chat message', msg); // Enviar a todos
  });

  socket.on('disconnect', () => {
    const nombre = usuariosConectados.get(socket.id);
    if (nombre) {
      io.emit('usuario desconectado', `${nombre} se ha desconectado`);
      usuariosConectados.delete(socket.id);
    }
    console.log('Usuario desconectado:', socket.id);
  });
  // Nuevo evento "escribiendo"
  socket.on('escribiendo', (nombre) => {
    socket.broadcast.emit('mostrar escribiendo', nombre);
  });
}); //Fin del configurar Socket

//El servidor node.js escucha al puerto 3000
server.listen(3000, () => {
  console.log('Servidor escuchando en http://localhost:3000');
});
