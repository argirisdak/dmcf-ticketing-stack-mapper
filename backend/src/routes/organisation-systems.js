const express = require('express');
const organisationSystemController = require('../controllers/organisation-system-controller');

const router = express.Router({ mergeParams: true });

router.get('/', organisationSystemController.listLinks);
router.post('/', organisationSystemController.createLink);
router.put('/:linkId', organisationSystemController.updateLink);
router.delete('/:linkId', organisationSystemController.deleteLink);

module.exports = router;
