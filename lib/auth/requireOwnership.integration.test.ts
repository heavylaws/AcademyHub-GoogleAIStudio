import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { requireOwnership } from './requireOwnership';
import { AuthUser } from './types';

const suffix = `phase33_${Date.now()}`;
const parentId = `${suffix}_parent`;
const otherParentId = `${suffix}_other`;
const coachId = `${suffix}_coach`;
const assessmentId = `${suffix}_assessment`;
const athleteId = `${suffix}_athlete`;

let parentUser: AuthUser;
let otherParent: AuthUser;
let coachUser: AuthUser;

describe('requireOwnership assessment live Postgres join', () => {
  it('resolves ownership through Assessment.athlete.parentUserId', async () => {
    const academy = await prisma.academy.create({
      data: { name: 'Test Academy', slug: `test_academy_${suffix}` },
    });
    const academyId = academy.id;

    parentUser = { uid: parentId, role: 'parent', academyId, claims: { role: 'parent' } };
    otherParent = { uid: otherParentId, role: 'parent', academyId, claims: { role: 'parent' } };
    coachUser = { uid: coachId, role: 'coach', academyId, claims: { role: 'coach' } };

    await prisma.user.createMany({
      data: [
        { id: parentId, email: `${parentId}@example.com`, displayName: 'Test Parent' },
        { id: otherParentId, email: `${otherParentId}@example.com`, displayName: 'Other Test Parent' },
        { id: coachId, email: `${coachId}@example.com`, displayName: 'Test Coach' },
      ],
    });

    await prisma.membership.createMany({
      data: [
        { userId: parentId, academyId, role: 'PARENT' },
        { userId: otherParentId, academyId, role: 'PARENT' },
        { userId: coachId, academyId, role: 'COACH' },
      ],
    });
    await prisma.athlete.create({
      data: {
        id: athleteId,
        academyId,
        name: 'Phase 3.3 Test Athlete',
        parentUserId: parentId,
        parentEmail: `${parentId}@example.com`,
        guardianConsent: true,
      },
    });
    await prisma.assessment.create({
      data: {
        id: assessmentId,
        academyId,
        athleteId,
        athleteName: 'Phase 3.3 Test Athlete',
        sport: 'Test',
        exerciseType: 'Test Exercise',
        quantitativeMetrics: { valid_reps: 1, duration_seconds: 1 },
        qualitativeObservations: { form_quality_score: 1, endurance_score: 1, fault_tags: [], coach_notes: '' },
        mediaReferences: { smart_grid_processed: false },
        computedScore: 1,
        coachId,
      },
    });

    await expect(requireOwnership(parentUser, 'assessment', assessmentId)).resolves.toBeUndefined();
    await expect(requireOwnership(otherParent, 'assessment', assessmentId)).rejects.toThrow('You do not own');
    await expect(requireOwnership(coachUser, 'assessment', assessmentId)).resolves.toBeUndefined();
  });

  it('denies access across different tenants', async () => {
    const academyB = await prisma.academy.create({
      data: { name: 'Test Academy B', slug: `test_academy_b_${suffix}` },
    });
    const athleteBId = `${suffix}_athlete_b`;
    const parentBId = `${suffix}_parent_b`;

    await prisma.user.create({
      data: { id: parentBId, email: `${parentBId}@example.com`, displayName: 'Parent B' },
    });
    await prisma.membership.create({
      data: { userId: parentBId, academyId: academyB.id, role: 'PARENT' },
    });
    await prisma.athlete.create({
      data: {
        id: athleteBId,
        academyId: academyB.id,
        name: 'Phase 3.3 Test Athlete B',
        parentUserId: parentBId,
        parentEmail: `${parentBId}@example.com`,
        guardianConsent: true,
      },
    });

    // parentUser has academyId from academy A. Trying to access athlete in academy B.
    await expect(requireOwnership(parentUser, 'athlete', athleteBId)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Resource not found',
    });

    await prisma.athlete.delete({ where: { id: athleteBId } });
    await prisma.user.delete({ where: { id: parentBId } });
    await prisma.academy.delete({ where: { id: academyB.id } });
  });

  it('returns 404 for soft-deleted athlete or assessment', async () => {
    const softDeletedAthId = `${suffix}_soft_ath`;
    await prisma.athlete.create({
      data: {
        id: softDeletedAthId,
        academyId: parentUser.academyId!,
        name: 'Soft Deleted Athlete',
        parentUserId: parentId,
        parentEmail: `${parentId}@example.com`,
        guardianConsent: true,
        deletedAt: new Date(),
      },
    });

    await expect(requireOwnership(parentUser, 'athlete', softDeletedAthId)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Resource not found',
    });

    await prisma.athlete.delete({ where: { id: softDeletedAthId } });
  });

  afterAll(async () => {
    await prisma.assessment.deleteMany({ where: { id: assessmentId } });
    await prisma.athlete.deleteMany({ where: { id: athleteId } });
    await prisma.user.deleteMany({ where: { id: { in: [parentId, otherParentId, coachId] } } });
    await prisma.academy.deleteMany({ where: { slug: `test_academy_${suffix}` } });
    await prisma.$disconnect();
  });
});
