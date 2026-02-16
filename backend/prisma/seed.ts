import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const questLibraryData = [
  // Chores
  { name: 'Clean your room', description: 'Tidy up your bedroom, put things away, and make it look nice', icon: '🧹', category: 'chores', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Make your bed', description: 'Pull up the sheets and arrange your pillows neatly', icon: '🛏️', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Help with dishes', description: 'Help wash, dry, or load the dishwasher after a meal', icon: '🍽️', category: 'chores', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 3 },
  { name: 'Take out the trash', description: 'Take the trash bags to the bin outside', icon: '🗑️', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 4 },
  { name: 'Fold laundry', description: 'Fold your clean clothes and put them away', icon: '👕', category: 'chores', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 5 },
  { name: 'Set the table', description: 'Set plates, cups, and utensils for the family meal', icon: '🍴', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 6 },

  // Studying
  { name: 'Do math homework', description: 'Complete your math assignments for today', icon: '🔢', category: 'studying', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Do reading homework', description: 'Complete your reading assignments', icon: '📖', category: 'studying', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Practice spelling', description: 'Practice your spelling words for the week', icon: '✏️', category: 'studying', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 3 },
  { name: 'Study for a test', description: 'Review your notes and study materials', icon: '📝', category: 'studying', suggestedRewardSeconds: 2700, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 4 },
  { name: 'Complete a worksheet', description: 'Finish a practice worksheet or workbook page', icon: '📋', category: 'studying', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 5 },

  // Reading
  { name: 'Read for 30 minutes', description: 'Read a book of your choice for 30 minutes', icon: '📚', category: 'reading', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Read a chapter', description: 'Read one full chapter of your current book', icon: '📖', category: 'reading', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 2 },
  { name: 'Visit the library', description: 'Go to the library and pick out a new book', icon: '🏛️', category: 'reading', suggestedRewardSeconds: 2700, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 3 },

  // Exercise
  { name: 'Play outside for 30 minutes', description: 'Go outside and play, run around, and have fun!', icon: '🌳', category: 'exercise', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Ride your bike', description: 'Go for a bike ride around the neighborhood', icon: '🚲', category: 'exercise', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 2 },
  { name: 'Practice a sport', description: 'Practice your favorite sport for at least 30 minutes', icon: '⚽', category: 'exercise', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 3 },
  { name: 'Do stretching or yoga', description: 'Do a stretching or yoga routine', icon: '🧘', category: 'exercise', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 4 },

  // Creative
  { name: 'Practice an instrument', description: 'Practice piano, guitar, or any instrument for 30 minutes', icon: '🎹', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Draw or paint', description: 'Create a drawing or painting — let your creativity flow!', icon: '🎨', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Build something', description: 'Build with LEGO, blocks, or craft materials', icon: '🧱', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 3 },
  { name: 'Write a story', description: 'Write a short story, poem, or journal entry', icon: '✍️', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 4 },

  // Helping Others
  { name: 'Help a sibling', description: 'Help your brother or sister with something they need', icon: '🤝', category: 'helping_others', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Help a neighbor', description: 'Do something kind for a neighbor', icon: '🏘️', category: 'helping_others', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 2 },
  { name: 'Do a kind deed', description: 'Do something nice for someone without being asked', icon: '💝', category: 'helping_others', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 3 },
];

async function main() {
  console.log('Seeding quest library...');

  const existingCount = await prisma.questLibrary.count();
  if (existingCount > 0) {
    console.log(`Quest library already has ${existingCount} entries, skipping seed`);
  } else {
    await prisma.questLibrary.createMany({
      data: questLibraryData.map((q) => ({
        ...q,
        isPublished: true,
      })),
    });
    console.log(`Seeded ${questLibraryData.length} quest library entries`);
  }

  // Seed quest categories
  const existingCategories = await prisma.questCategory.count();
  if (existingCategories === 0) {
    const categories = [
      { name: 'Chores', icon: '🧹', sortOrder: 1 },
      { name: 'Studying', icon: '📝', sortOrder: 2 },
      { name: 'Reading', icon: '📚', sortOrder: 3 },
      { name: 'Exercise', icon: '🏃', sortOrder: 4 },
      { name: 'Creative', icon: '🎨', sortOrder: 5 },
      { name: 'Helping Others', icon: '🤝', sortOrder: 6 },
    ];
    await prisma.questCategory.createMany({ data: categories });
    console.log(`Seeded ${categories.length} quest categories`);
  } else {
    console.log(`Quest categories already have ${existingCategories} entries, skipping`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
