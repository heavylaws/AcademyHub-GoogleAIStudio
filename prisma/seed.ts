import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { auth } from '../lib/auth/betterAuth';
import { internalInviteScope } from '../lib/auth/internalInviteScope';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const targetPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();

  if (!targetEmail) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL is required.');
  }

  let user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, email: true },
  });

  if (!user) {
    if (!targetPassword) {
      console.error(`User ${targetEmail} not found. Please provide ADMIN_BOOTSTRAP_PASSWORD in your .env to create the bootstrap account.`);
      process.exitCode = 1;
      return;
    }
    
    console.log(`Creating bootstrap user ${targetEmail}...`);
    // Create user via BetterAuth, bypassing the public signup block
    const signUpResult = await internalInviteScope.run(true, async () => {
      return await auth.api.signUpEmail({
        body: { email: targetEmail, password: targetPassword, name: 'Platform Admin' }
      });
    });
    
    user = { id: signUpResult.user.id, email: signUpResult.user.email };
    console.log(`Created bootstrap account with ID: ${user.id}`);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isPlatformAdmin: true,
    },
    select: { id: true, email: true, isPlatformAdmin: true },
  });

  console.log(`Granted platform admin status (isPlatformAdmin: ${updatedUser.isPlatformAdmin}) to ${updatedUser.email}.`);

  // Ensure default Academies exist for testing & metrics
  const academy = await prisma.academy.upsert({
    where: { slug: 'apex-athletics' },
    update: {},
    create: {
      name: 'Apex Athletics Academy',
      slug: 'apex-athletics',
      isActive: true,
    },
  });

  await prisma.academy.upsert({
    where: { slug: 'horizon-youth-sports' },
    update: {},
    create: {
      name: 'Horizon Youth Sports Academy',
      slug: 'horizon-youth-sports',
      isActive: true,
    },
  });

  await prisma.academy.upsert({
    where: { slug: 'titan-performance' },
    update: {},
    create: {
      name: 'Titan Performance Center',
      slug: 'titan-performance',
      isActive: true,
    },
  });

  // Ensure the bootstrap admin user has an ADMIN membership in the default academy
  await prisma.membership.upsert({
    where: {
      userId_academyId: {
        userId: updatedUser.id,
        academyId: academy.id,
      },
    },
    update: { role: 'ADMIN' },
    create: {
      userId: updatedUser.id,
      academyId: academy.id,
      role: 'ADMIN',
    },
  });

  console.log(`Assigned ADMIN membership for academy '${academy.name}' (${academy.id}) to ${updatedUser.email}.`);

  // Seed sample athletes
  const athlete1 = await prisma.athlete.create({
    data: {
      academyId: academy.id,
      name: 'Marcus Vance',
      dob: '2010-04-12',
      parentUserId: updatedUser.id,
      parentEmail: updatedUser.email,
      emergencyContact: '+1 (555) 234-5678',
      guardianConsent: true,
      guardianConsentDate: '2026-01-15',
      sports: {
        create: [
          { sport: 'Basketball', monthlyFee: 250.00 },
          { sport: 'Track & Field', monthlyFee: 150.00 }
        ]
      }
    }
  });

  const athlete2 = await prisma.athlete.create({
    data: {
      academyId: academy.id,
      name: 'Elena Rostova',
      dob: '2011-08-23',
      parentUserId: updatedUser.id,
      parentEmail: updatedUser.email,
      emergencyContact: '+1 (555) 876-5432',
      guardianConsent: true,
      guardianConsentDate: '2026-02-01',
      sports: {
        create: [
          { sport: 'Tennis', monthlyFee: 300.00 }
        ]
      }
    }
  });

  const athlete3 = await prisma.athlete.create({
    data: {
      academyId: academy.id,
      name: 'Jordan Hayes',
      dob: '2009-11-05',
      parentUserId: updatedUser.id,
      parentEmail: updatedUser.email,
      emergencyContact: '+1 (555) 345-6789',
      guardianConsent: true,
      guardianConsentDate: '2026-01-20',
      sports: {
        create: [
          { sport: 'Soccer', monthlyFee: 200.00 }
        ]
      }
    }
  });

  console.log('Seeded 3 sample athletes.');

  // Seed sample assessments
  await prisma.assessment.createMany({
    data: [
      {
        academyId: academy.id,
        athleteId: athlete1.id,
        athleteName: athlete1.name,
        parentEmail: updatedUser.email,
        sport: 'Basketball',
        exerciseType: 'Vertical Jump & Explosiveness',
        coachId: updatedUser.id,
        coachName: 'Coach Vance',
        dataSource: 'AI_AGENTIC',
        pipelineStatus: 'AI_EVALUATED',
        computedScore: 92.5,
        rubricGrade: 'A',
        quantitativeMetrics: { jump_height_inches: 28.5, takeoff_velocity_ms: 3.42, peak_power_watts: 2450 },
        qualitativeObservations: { form: 'Excellent hip hinge extension', landing: 'Soft knee flexion, balanced bilateral contact' },
        mediaReferences: { video_url: 'https://storage.googleapis.com/academyhub/videos/vance_jump_01.mp4' },
        agentInsights: { recommendation: 'Incorporate depth jumps to further optimize reactive strength index.' }
      },
      {
        academyId: academy.id,
        athleteId: athlete2.id,
        athleteName: athlete2.name,
        parentEmail: updatedUser.email,
        sport: 'Tennis',
        exerciseType: 'Lateral Change of Direction',
        coachId: updatedUser.id,
        coachName: 'Coach Vance',
        dataSource: 'AI_AGENTIC',
        pipelineStatus: 'AI_EVALUATED',
        computedScore: 88.0,
        rubricGrade: 'A-',
        quantitativeMetrics: { sprint_5m_sec: 1.18, plant_angle_deg: 42, deceleration_g: 4.1 },
        qualitativeObservations: { form: 'Strong low center of gravity', landing: 'Slight outward knee valgus on left plant' },
        mediaReferences: { video_url: 'https://storage.googleapis.com/academyhub/videos/elena_shuttle_01.mp4' },
        agentInsights: { recommendation: 'Add single-leg glute medius strengthening to correct left plant angle.' }
      },
      {
        academyId: academy.id,
        athleteId: athlete3.id,
        athleteName: athlete3.name,
        parentEmail: updatedUser.email,
        sport: 'Soccer',
        exerciseType: 'Max Velocity Sprint Kinematics',
        coachId: updatedUser.id,
        coachName: 'Coach Vance',
        dataSource: 'AI_AGENTIC',
        pipelineStatus: 'AI_EVALUATED',
        computedScore: 95.0,
        rubricGrade: 'A+',
        quantitativeMetrics: { max_speed_mph: 19.8, stride_frequency_hz: 4.5, ground_contact_time_ms: 102 },
        qualitativeObservations: { form: 'Elite front-side mechanics and arm drive', landing: 'Mid-foot ground strike' },
        mediaReferences: { video_url: 'https://storage.googleapis.com/academyhub/videos/jordan_sprint_01.mp4' },
        agentInsights: { recommendation: 'Maintain current plyometric volume and focus on hamstring eccentrics.' }
      }
    ]
  });

  console.log('Seeded 3 sample biomechanics assessments.');

  // Seed sample schedules
  await prisma.schedule.createMany({
    data: [
      {
        academyId: academy.id,
        title: 'Elite Basketball Biomechanics Lab',
        sport: 'Basketball',
        facility: 'Main Court A',
        coachId: updatedUser.id,
        coachName: 'Coach Vance',
        date: '2026-08-29',
        timeSlot: '09:00 - 10:30',
        maxCapacity: 15,
        enrolledCount: 12
      },
      {
        academyId: academy.id,
        title: 'Youth Speed & Sprint Kinematics',
        sport: 'Track & Field',
        facility: 'Indoor Running Track',
        coachId: updatedUser.id,
        coachName: 'Coach Vance',
        date: '2026-08-29',
        timeSlot: '11:00 - 12:30',
        maxCapacity: 20,
        enrolledCount: 18
      },
      {
        academyId: academy.id,
        title: 'High-Performance Agility Training',
        sport: 'Soccer',
        facility: 'Turf Field 2',
        coachId: updatedUser.id,
        coachName: 'Coach Vance',
        date: '2026-08-30',
        timeSlot: '14:00 - 15:30',
        maxCapacity: 16,
        enrolledCount: 14
      }
    ]
  });

  console.log('Seeded 3 sample facility schedules.');

  // Seed sample invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      academyId: academy.id,
      parentUserId: updatedUser.id,
      parentName: 'Platform Admin',
      parentEmail: updatedUser.email,
      subtotal: 400.00,
      discountedChildName: 'Marcus Vance',
      siblingDiscountAmount: 40.00,
      netTotal: 360.00,
      paymentSchedule: 'UPFRONT',
      paymentStatus: 'PAID',
      issuedDate: '2026-08-01',
      children: {
        create: [
          { childName: 'Marcus Vance', sport: 'Basketball', monthlyFee: 250.00 },
          { childName: 'Elena Rostova', sport: 'Tennis', monthlyFee: 150.00 }
        ]
      },
      installments: {
        create: [
          { label: 'Full Payment (Upfront)', amount: 360.00, dueDate: '2026-08-05', status: 'DUE_NOW' }
        ]
      }
    }
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      academyId: academy.id,
      parentUserId: updatedUser.id,
      parentName: 'Platform Admin',
      parentEmail: updatedUser.email,
      subtotal: 200.00,
      siblingDiscountAmount: 0.00,
      netTotal: 200.00,
      paymentSchedule: 'UPFRONT',
      paymentStatus: 'PAID',
      issuedDate: '2026-08-15',
      children: {
        create: [
          { childName: 'Jordan Hayes', sport: 'Soccer', monthlyFee: 200.00 }
        ]
      },
      installments: {
        create: [
          { label: 'Full Payment (Upfront)', amount: 200.00, dueDate: '2026-08-20', status: 'DUE_NOW' }
        ]
      }
    }
  });

  console.log('Seeded 2 sample paid invoices ($560 total revenue).');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
