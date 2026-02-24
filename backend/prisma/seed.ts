import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const questLibraryData = [
  // ─── Chores ─────────────────────────────────────────────
  { name: 'Clean your room', description: 'Tidy up your bedroom, put things away, and make it look nice', icon: '🧹', category: 'chores', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Make your bed', description: 'Pull up the sheets and arrange your pillows neatly', icon: '🛏️', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Help with dishes', description: 'Help wash, dry, or load the dishwasher after a meal', icon: '🍽️', category: 'chores', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 3 },
  { name: 'Take out the trash', description: 'Take the trash bags to the bin outside', icon: '🗑️', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 4 },
  { name: 'Fold laundry', description: 'Fold your clean clothes and put them away', icon: '👕', category: 'chores', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 5 },
  { name: 'Set the table', description: 'Set plates, cups, and utensils for the family meal', icon: '🍴', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 6 },
  { name: 'Water the plants', description: 'Water all the indoor and outdoor plants that need it', icon: '🪴', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 7 },
  { name: 'Vacuum a room', description: 'Vacuum the floors in one room of the house', icon: '🧽', category: 'chores', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 8 },
  { name: 'Wipe down surfaces', description: 'Use a damp cloth to wipe tables, counters, and shelves', icon: '✨', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 9 },
  { name: 'Put away groceries', description: 'Help unpack and organize the groceries after a shopping trip', icon: '🛒', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 10 },
  { name: 'Organize your backpack', description: 'Clean out your backpack, toss old papers, and organize what you need', icon: '🎒', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 11 },
  { name: 'Sort recycling', description: 'Separate recyclables from trash and put them in the right bins', icon: '♻️', category: 'chores', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 12 },
  { name: 'Tidy the living room', description: 'Put toys, remotes, and pillows back where they belong', icon: '🛋️', category: 'chores', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 13 },
  { name: 'Sweep the floor', description: 'Sweep the kitchen or another room to clear crumbs and dirt', icon: '🧹', category: 'chores', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 14 },

  // ─── Studying ───────────────────────────────────────────
  { name: 'Do math homework', description: 'Complete your math assignments for today', icon: '🔢', category: 'studying', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Do reading homework', description: 'Complete your reading assignments', icon: '📖', category: 'studying', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Practice spelling', description: 'Practice your spelling words for the week', icon: '✏️', category: 'studying', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 3 },
  { name: 'Study for a test', description: 'Review your notes and study materials for an upcoming test', icon: '📝', category: 'studying', suggestedRewardSeconds: 2700, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 4 },
  { name: 'Complete a worksheet', description: 'Finish a practice worksheet or workbook page', icon: '📋', category: 'studying', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Practice multiplication tables', description: 'Drill your times tables until they feel easy', icon: '✖️', category: 'studying', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 6 },
  { name: 'Practice handwriting', description: 'Write neatly on practice paper to improve your handwriting', icon: '🖊️', category: 'studying', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 7 },
  { name: 'Do science homework', description: 'Complete your science assignments or study guide', icon: '🔬', category: 'studying', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 8 },
  { name: 'Practice sight words', description: 'Read and memorize your sight word flashcards', icon: '👁️', category: 'studying', suggestedRewardSeconds: 900, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 9 },
  { name: 'Review flashcards', description: 'Go through a set of flashcards for any subject', icon: '🃏', category: 'studying', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 10 },
  { name: 'Learn 5 new vocabulary words', description: 'Look up, write down, and practice using 5 new words', icon: '📓', category: 'studying', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 11 },
  { name: 'Do a typing lesson', description: 'Complete a typing practice session to improve speed and accuracy', icon: '⌨️', category: 'studying', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 12 },

  // ─── Reading ────────────────────────────────────────────
  { name: 'Read for 30 minutes', description: 'Read a book of your choice for 30 minutes', icon: '📚', category: 'reading', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Read a chapter', description: 'Read one full chapter of your current book', icon: '📖', category: 'reading', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 2 },
  { name: 'Visit the library', description: 'Go to the library and pick out a new book', icon: '🏛️', category: 'reading', suggestedRewardSeconds: 2700, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 3 },
  { name: 'Read for 15 minutes', description: 'Read a picture book or easy reader for 15 minutes', icon: '📕', category: 'reading', suggestedRewardSeconds: 900, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 4 },
  { name: 'Read aloud to someone', description: 'Practice reading out loud to a parent, sibling, or pet', icon: '🗣️', category: 'reading', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Write a book report', description: 'Write a short summary and your opinion about a book you finished', icon: '📝', category: 'reading', suggestedRewardSeconds: 2700, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 6 },
  { name: 'Read a non-fiction article', description: 'Read a kid-friendly news article or encyclopedia entry', icon: '🗞️', category: 'reading', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 7 },
  { name: 'Listen to an audiobook', description: 'Listen to an audiobook or story podcast for 20 minutes', icon: '🎧', category: 'reading', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 8 },
  { name: 'Read a comic or graphic novel', description: 'Enjoy a comic book or graphic novel chapter', icon: '💬', category: 'reading', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 9 },

  // ─── Exercise ───────────────────────────────────────────
  { name: 'Play outside for 30 minutes', description: 'Go outside and play, run around, and have fun!', icon: '🌳', category: 'exercise', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Ride your bike', description: 'Go for a bike ride around the neighborhood', icon: '🚲', category: 'exercise', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 2 },
  { name: 'Practice a sport', description: 'Practice your favorite sport for at least 30 minutes', icon: '⚽', category: 'exercise', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 3 },
  { name: 'Do stretching or yoga', description: 'Do a stretching or yoga routine to stay flexible', icon: '🧘', category: 'exercise', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 4 },
  { name: 'Jump rope for 10 minutes', description: 'Grab a jump rope and see how many jumps you can do!', icon: '🤸', category: 'exercise', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Go for a walk', description: 'Take a walk around the block or on a nature trail', icon: '🚶', category: 'exercise', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 6 },
  { name: 'Do 20 jumping jacks', description: 'Get your heart pumping with 20 jumping jacks', icon: '⭐', category: 'exercise', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 7 },
  { name: 'Play catch or frisbee', description: 'Play catch with a ball or frisbee with a friend or parent', icon: '🥏', category: 'exercise', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 8 },
  { name: 'Go swimming', description: 'Spend time swimming at the pool, lake, or beach', icon: '🏊', category: 'exercise', suggestedRewardSeconds: 2700, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 9 },
  { name: 'Ride a scooter or skateboard', description: 'Practice riding your scooter or skateboard outside', icon: '🛴', category: 'exercise', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 10 },
  { name: 'Dance for 15 minutes', description: 'Put on music and dance around — get moving and have fun!', icon: '💃', category: 'exercise', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 11 },
  { name: 'Play at the park', description: 'Visit the playground and climb, swing, and slide', icon: '🛝', category: 'exercise', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'ages_4_7', sortOrder: 12 },

  // ─── Creative ───────────────────────────────────────────
  { name: 'Practice an instrument', description: 'Practice piano, guitar, or any instrument for 30 minutes', icon: '🎹', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Draw or paint', description: 'Create a drawing or painting — let your creativity flow!', icon: '🎨', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Build something', description: 'Build with LEGO, blocks, or craft materials', icon: '🧱', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 3 },
  { name: 'Write a story', description: 'Write a short story, poem, or journal entry', icon: '✍️', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 4 },
  { name: 'Do a craft project', description: 'Complete a craft — origami, paper-mâché, friendship bracelets, or more', icon: '🎭', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Learn a new song', description: 'Learn the words or melody to a new song', icon: '🎵', category: 'creative', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 6 },
  { name: 'Make a comic strip', description: 'Create a short comic strip with your own characters and story', icon: '🖍️', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 7 },
  { name: 'Do a puzzle', description: 'Work on a jigsaw puzzle, crossword, or brain teaser', icon: '🧩', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 8 },
  { name: 'Color a page', description: 'Color in a coloring book page with care and creativity', icon: '🌈', category: 'creative', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 9 },
  { name: 'Take photos of nature', description: 'Go outside and capture interesting things with a camera', icon: '📷', category: 'creative', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 10 },
  { name: 'Put on a puppet show', description: 'Make puppets and perform a story for your family', icon: '🎪', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 11 },
  { name: 'Design a poster or sign', description: 'Create a colorful poster about something you love', icon: '🖼️', category: 'creative', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 12 },

  // ─── Helping Others ─────────────────────────────────────
  { name: 'Help a sibling', description: 'Help your brother or sister with something they need', icon: '🤝', category: 'helping_others', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Help a neighbor', description: 'Do something kind for a neighbor', icon: '🏘️', category: 'helping_others', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 2 },
  { name: 'Do a kind deed', description: 'Do something nice for someone without being asked', icon: '💝', category: 'helping_others', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 3 },
  { name: 'Write a thank-you note', description: 'Write a card or note thanking someone for something they did', icon: '💌', category: 'helping_others', suggestedRewardSeconds: 900, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 4 },
  { name: 'Teach someone something', description: 'Share a skill or fact with a sibling, friend, or parent', icon: '🎓', category: 'helping_others', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 5 },
  { name: 'Make a gift for someone', description: 'Create a handmade gift — a drawing, card, or craft', icon: '🎁', category: 'helping_others', suggestedRewardSeconds: 1800, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 6 },
  { name: 'Donate toys or clothes', description: 'Pick out items you no longer use to donate to others in need', icon: '📦', category: 'helping_others', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 7 },
  { name: 'Comfort someone who is sad', description: 'Be there for a friend or sibling who is having a tough time', icon: '🫂', category: 'helping_others', suggestedRewardSeconds: 900, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 8 },
  { name: 'Help carry groceries', description: 'Help a parent or grandparent carry bags in from the car', icon: '💪', category: 'helping_others', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 9 },

  // ─── Life Skills ────────────────────────────────────────
  { name: 'Pack your own lunch', description: 'Make and pack a healthy lunch for school tomorrow', icon: '🥪', category: 'life_skills', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 1 },
  { name: 'Pick out your clothes for tomorrow', description: 'Choose and lay out your outfit for the next day', icon: '👔', category: 'life_skills', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Learn to tie your shoes', description: 'Practice tying your shoelaces by yourself', icon: '👟', category: 'life_skills', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'ages_4_7', sortOrder: 3 },
  { name: 'Help cook a meal', description: 'Assist a parent in preparing breakfast, lunch, or dinner', icon: '👨‍🍳', category: 'life_skills', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 4 },
  { name: 'Make a snack', description: 'Prepare a healthy snack for yourself (with permission)', icon: '🍎', category: 'life_skills', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Learn a new recipe', description: 'Follow a simple recipe to make something yummy', icon: '📜', category: 'life_skills', suggestedRewardSeconds: 2700, suggestedStackingType: 'stackable', ageRange: 'ages_8_12', sortOrder: 6 },
  { name: 'Organize your desk', description: 'Tidy up your homework desk or study area', icon: '🗂️', category: 'life_skills', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 7 },
  { name: 'Practice telling time', description: 'Read an analog clock and tell the time correctly 5 times', icon: '🕐', category: 'life_skills', suggestedRewardSeconds: 900, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 8 },
  { name: 'Count and sort coins', description: 'Practice counting money and sorting coins by type', icon: '🪙', category: 'life_skills', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 9 },
  { name: 'Write a to-do list', description: 'Plan your day by writing down tasks you want to accomplish', icon: '📝', category: 'life_skills', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 10 },
  { name: 'Do a load of laundry', description: 'Sort clothes, run the washer, and move to the dryer', icon: '🧺', category: 'life_skills', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 11 },

  // ─── Personal Care ──────────────────────────────────────
  { name: 'Brush your teeth (morning)', description: 'Brush your teeth thoroughly for 2 minutes after waking up', icon: '🪥', category: 'personal_care', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Brush your teeth (bedtime)', description: 'Brush your teeth thoroughly for 2 minutes before bed', icon: '🌙', category: 'personal_care', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Take a shower or bath', description: 'Wash up with soap and shampoo — squeaky clean!', icon: '🚿', category: 'personal_care', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 3 },
  { name: 'Comb or brush your hair', description: 'Make sure your hair is neat and tangle-free', icon: '💇', category: 'personal_care', suggestedRewardSeconds: 300, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 4 },
  { name: 'Wash your hands (5 times today)', description: 'Remember to wash your hands before meals and after playing', icon: '🧼', category: 'personal_care', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Get dressed independently', description: 'Put on your clothes by yourself without help', icon: '👗', category: 'personal_care', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'ages_4_7', sortOrder: 6 },
  { name: 'Complete your bedtime routine', description: 'Pajamas, teeth, face wash, and ready for bed — all on your own!', icon: '😴', category: 'personal_care', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 7 },
  { name: 'Complete your morning routine', description: 'Wake up, get dressed, eat breakfast, and brush teeth independently', icon: '🌅', category: 'personal_care', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 8 },

  // ─── Nature & Science ──────────────────────────────────
  { name: 'Do a science experiment', description: 'Try a safe, kid-friendly experiment at home with a parent', icon: '🧪', category: 'nature_science', suggestedRewardSeconds: 2700, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Go on a nature walk', description: 'Explore a trail, park, or your backyard and observe nature', icon: '🌿', category: 'nature_science', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Identify 3 plants or trees', description: 'Find and name three different plants, trees, or flowers outside', icon: '🌸', category: 'nature_science', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 3 },
  { name: 'Watch a nature documentary', description: 'Watch an educational nature or animal documentary (30 min max)', icon: '🐾', category: 'nature_science', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 4 },
  { name: 'Start a nature journal', description: 'Draw or write about something you noticed in nature today', icon: '🍃', category: 'nature_science', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Learn about an animal', description: 'Read or watch a video about an animal and share three fun facts', icon: '🦁', category: 'nature_science', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 6 },
  { name: 'Look at the night sky', description: 'Go outside at night and try to find constellations or planets', icon: '🌟', category: 'nature_science', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 7 },
  { name: 'Plant a seed', description: 'Plant a seed in a pot or garden and learn how to care for it', icon: '🌱', category: 'nature_science', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 8 },
  { name: 'Build a bird feeder', description: 'Make a simple bird feeder and hang it outside', icon: '🐦', category: 'nature_science', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 9 },
  { name: 'Collect and identify rocks', description: 'Find interesting rocks and try to identify what type they are', icon: '🪨', category: 'nature_science', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 10 },

  // ─── Mindfulness & Wellness ────────────────────────────
  { name: 'Practice deep breathing', description: 'Do 5 minutes of deep breathing exercises to calm your mind', icon: '🌬️', category: 'mindfulness', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Write in a gratitude journal', description: 'Write down 3 things you are grateful for today', icon: '🙏', category: 'mindfulness', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Meditate for 5 minutes', description: 'Sit quietly and focus on your breathing for 5 minutes', icon: '🧘‍♂️', category: 'mindfulness', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 3 },
  { name: 'No screen time for 1 hour', description: 'Spend a full hour doing activities that do not involve screens', icon: '📵', category: 'mindfulness', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 4 },
  { name: 'Draw your feelings', description: 'Use colors and shapes to express how you are feeling today', icon: '🎨', category: 'mindfulness', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Do a body scan relaxation', description: 'Lie down and relax each part of your body from toes to head', icon: '🛌', category: 'mindfulness', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 6 },
  { name: 'Say 3 kind things about yourself', description: 'Look in the mirror and say three positive things about yourself', icon: '💛', category: 'mindfulness', suggestedRewardSeconds: 300, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 7 },
  { name: 'Listen to calming music', description: 'Spend 10 minutes listening to peaceful or calming music', icon: '🎶', category: 'mindfulness', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 8 },

  // ─── Pet Care ──────────────────────────────────────────
  { name: 'Feed your pet', description: 'Give your pet their food and fresh water', icon: '🐕', category: 'pet_care', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Walk the dog', description: 'Take the dog for a walk around the neighborhood', icon: '🦮', category: 'pet_care', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 2 },
  { name: 'Clean the pet area', description: 'Clean your pet cage, bed, litter box, or tank', icon: '🐾', category: 'pet_care', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'ages_8_12', sortOrder: 3 },
  { name: 'Play with your pet', description: 'Spend quality time playing with your pet for 15 minutes', icon: '🎾', category: 'pet_care', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 4 },
  { name: 'Brush your pet', description: 'Give your pet a gentle brushing to keep their fur nice', icon: '🐈', category: 'pet_care', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Refill the water bowl', description: 'Make sure your pet always has fresh, clean water', icon: '💧', category: 'pet_care', suggestedRewardSeconds: 300, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 6 },

  // ─── Social Skills ─────────────────────────────────────
  { name: 'Call or video-chat a grandparent', description: 'Spend time talking with a grandparent or relative on the phone', icon: '📞', category: 'social_skills', suggestedRewardSeconds: 1200, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 1 },
  { name: 'Write a letter to a friend', description: 'Write a letter or draw a picture to mail to a friend', icon: '✉️', category: 'social_skills', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 2 },
  { name: 'Play a board game with family', description: 'Choose a board game and play it together with your family', icon: '🎲', category: 'social_skills', suggestedRewardSeconds: 1800, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 3 },
  { name: 'Practice saying please and thank you', description: 'Make an effort to use polite words all day long', icon: '😊', category: 'social_skills', suggestedRewardSeconds: 900, suggestedStackingType: 'non_stackable', ageRange: 'ages_4_7', sortOrder: 4 },
  { name: 'Have a screen-free playdate', description: 'Invite a friend over and play together without any screens', icon: '👫', category: 'social_skills', suggestedRewardSeconds: 2700, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 5 },
  { name: 'Share something with a friend', description: 'Practice sharing a toy, snack, or game with someone', icon: '🤲', category: 'social_skills', suggestedRewardSeconds: 600, suggestedStackingType: 'stackable', ageRange: 'ages_4_7', sortOrder: 6 },
  { name: 'Resolve a conflict peacefully', description: 'Work through a disagreement using words and compromise', icon: '🕊️', category: 'social_skills', suggestedRewardSeconds: 1200, suggestedStackingType: 'stackable', ageRange: 'all', sortOrder: 7 },
  { name: 'Introduce yourself to someone new', description: 'Practice meeting new people with a smile and a handshake', icon: '👋', category: 'social_skills', suggestedRewardSeconds: 600, suggestedStackingType: 'non_stackable', ageRange: 'all', sortOrder: 8 },
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
      { name: 'Life Skills', icon: '🎯', sortOrder: 7 },
      { name: 'Personal Care', icon: '🪥', sortOrder: 8 },
      { name: 'Nature & Science', icon: '🔬', sortOrder: 9 },
      { name: 'Mindfulness', icon: '🧘', sortOrder: 10 },
      { name: 'Pet Care', icon: '🐾', sortOrder: 11 },
      { name: 'Social Skills', icon: '👋', sortOrder: 12 },
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
