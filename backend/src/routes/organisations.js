const express = require('express');
const organisationController = require('../controllers/organisation-controller');
const organisationSystemsRouter = require('./organisation-systems');

const router = express.Router();

router.post('/', organisationController.createOrganisation);
router.get('/', organisationController.listOrganisations);
router.get('/check-similar', organisationController.checkSimilarOrganisations);
router.get('/:id', organisationController.getOrganisationById);
router.put('/:id', organisationController.updateOrganisation);
router.delete('/:id', organisationController.deleteOrganisation);
router.use('/:id/systems', organisationSystemsRouter);

module.exports = router;
