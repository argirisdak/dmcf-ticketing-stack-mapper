const express = require('express');
const organisationController = require('../controllers/organisation-controller');

const router = express.Router();

router.post('/', organisationController.createOrganisation);
router.get('/', organisationController.listOrganisations);
router.get('/:id', organisationController.getOrganisationById);
router.put('/:id', organisationController.updateOrganisation);
router.delete('/:id', organisationController.deleteOrganisation);

module.exports = router;
