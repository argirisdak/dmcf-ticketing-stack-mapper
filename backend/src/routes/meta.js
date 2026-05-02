const express = require('express');
const router = express.Router();
const metaController = require('../controllers/meta-controller');

router.get('/organisation-types', metaController.getOrganisationTypes);

module.exports = router;
