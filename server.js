require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(cors());

// Conectar a MongoDB
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Definir esquema y modelo de usuario
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    isMarked: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

let lastCopiedUser = null;
let copyIndex = 0;

// Obtener todos los datos
app.get('/users', async (req, res) => {
    try {
        const users = await User.find({ isMarked: false }).select('email -_id');
        const markedUsers = await User.find({ isMarked: true }).select('email -_id');
        res.json({
            users: users.map(u => u.email),
            markedUsers: markedUsers.map(u => u.email),
            lastCopiedUser,
            copyIndex
        });
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
});

// Agregar usuario
app.post('/users', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email requerido' });

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: 'Usuario ya existe' });

        await User.create({ email });
        res.json({ message: 'Usuario agregado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error agregando usuario' });
    }
});

// Eliminar usuario
app.delete('/users/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const deletedUser = await User.findOneAndDelete({ email });

        if (!deletedUser) return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
});

// Marcar/Desmarcar usuario
app.put('/users/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        user.isMarked = !user.isMarked;
        await user.save();

        res.json({ message: `Usuario ${user.isMarked ? 'marcado' : 'desmarcado'} exitosamente` });
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando usuario' });
    }
});

// Establecer último usuario copiado
app.post('/users/setLastCopied', async (req, res) => {
    try {
        const { lastCopiedUser: copiedUser, copyIndex: newIndex } = req.body;
        if (!copiedUser) return res.status(400).json({ error: 'Usuario copiado requerido' });

        lastCopiedUser = copiedUser;
        copyIndex = newIndex;

        res.json({ lastCopiedUser, copyIndex });
    } catch (error) {
        res.status(500).json({ error: 'Error estableciendo usuario copiado' });
    }
});

// Endpoint para reenvío automático de correos
app.get('/api/cuentas', async (req, res) => {
    try {
        const usuarios = await User.find({}).select('email -_id'); // todos los usuarios
        const cuentas = usuarios.map(u => ({
            email: u.email,
            password: 'Shala2024**' // contraseña común
        }));
        res.json(cuentas);
    } catch (error) {
        console.error('❌ Error en /api/cuentas:', error);
        res.status(500).json({ error: 'Error obteniendo cuentas' });
    }
});

// Servir HTML
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
