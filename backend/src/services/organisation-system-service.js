const prisma = require('../lib/prisma');
const { toLinkDto } = require('./organisation-system-dto');

const LINK_INCLUDE = {
  system: { select: { id: true, name: true, vendor: true, category: true } },
};

async function listLinks(orgId) {
  const org = await prisma.organisation.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) return null;
  const links = await prisma.organisationSystem.findMany({
    where: { organisation_id: orgId },
    include: LINK_INCLUDE,
    orderBy: { last_updated: 'desc' },
  });
  return links.map(toLinkDto);
}

async function createLink(orgId, { systemId, role, sourceReference, note }) {
  const link = await prisma.organisationSystem.create({
    data: {
      organisation_id: orgId,
      system_id: systemId,
      role,
      source_reference: sourceReference ?? null,
      note: note ?? null,
    },
    include: LINK_INCLUDE,
  });
  return toLinkDto(link);
}

async function updateLink(orgId, linkId, patch) {
  const existing = await prisma.organisationSystem.findFirst({
    where: { id: linkId, organisation_id: orgId },
  });
  if (!existing) return null;
  const data = {};
  if (patch.role !== undefined)            data.role = patch.role;
  if (patch.sourceReference !== undefined) data.source_reference = patch.sourceReference;
  if (patch.note !== undefined)            data.note = patch.note;
  if (patch.systemId !== undefined)        data.system_id = patch.systemId;
  try {
    const updated = await prisma.organisationSystem.update({
      where: { id: linkId },
      data,
      include: LINK_INCLUDE,
    });
    return toLinkDto(updated);
  } catch (err) {
    if (err.code === 'P2025') return null;
    throw err;
  }
}

async function deleteLink(orgId, linkId) {
  const existing = await prisma.organisationSystem.findFirst({
    where: { id: linkId, organisation_id: orgId },
  });
  if (!existing) return null;
  try {
    await prisma.organisationSystem.delete({ where: { id: linkId } });
  } catch (err) {
    if (err.code === 'P2025') return { id: linkId };
    throw err;
  }
  return { id: linkId };
}

module.exports = { listLinks, createLink, updateLink, deleteLink };
