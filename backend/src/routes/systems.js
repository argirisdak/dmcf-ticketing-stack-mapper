const express = require('express');
const systemController = require('../controllers/system-controller');

const router = express.Router();

router.get('/', systemController.listSystems);
router.post('/', systemController.createSystem);
router.get('/:id', systemController.getSystemById);
router.put('/:id', systemController.updateSystem);
router.delete('/:id', systemController.deleteSystem);

module.exports = router;
