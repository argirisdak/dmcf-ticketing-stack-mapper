const express = require('express');
const organisationController = require('../controllers/organisation-controller');

const router = express.Router();

router.get('/', organisationController.listOrganisations);

module.exports = router;
