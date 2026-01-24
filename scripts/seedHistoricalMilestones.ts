/**
 * Seed Historical AI Milestones
 * Sprint TD-3 - Historical Depth Expansion
 *
 * Adds foundational AI milestones from 1943-2012 to establish LAEA
 * as the authoritative source for complete AI history.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Create Prisma client with PostgreSQL adapter
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface HistoricalMilestone {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  significance: number;
  era: string;
  organization: string | null;
  contributors: string[];
  sourceUrl: string | null;
  tags: string[];
  layeredContent: {
    tldr: string;
    simpleExplanation: string;
    historicalContext: string;
    whyItMattersToday: string;
  };
}

/**
 * Historical AI Milestones Data
 * Organized chronologically from 1943 to 2012
 */
const HISTORICAL_MILESTONES: HistoricalMilestone[] = [
  // === FOUNDATIONAL ERA (1943-1955) ===
  {
    id: 'H1943_MCCULLOCH_PITTS',
    title: 'McCulloch-Pitts Neural Model Published',
    description:
      'Warren McCulloch and Walter Pitts published "A Logical Calculus of Ideas Immanent in Nervous Activity," introducing the first mathematical model of artificial neurons. This paper established the foundation for neural networks by showing how simple logical operations could be performed by networks of abstract neurons.',
    date: '1943-12-01',
    category: 'research',
    significance: 4,
    era: 'Foundations',
    organization: null,
    contributors: ['Warren McCulloch', 'Walter Pitts'],
    sourceUrl: 'https://www.cs.cmu.edu/~./epxing/Class/10715/reading/McCulloch.and" title="class">Pitts.pdf',
    tags: ['neural-networks', 'foundations', 'neuroscience', 'logic'],
    layeredContent: {
      tldr: 'First mathematical model of artificial neurons, establishing the theoretical foundation for neural networks.',
      simpleExplanation:
        'Before computers could "think," scientists needed to understand how thinking works. McCulloch (a neuroscientist) and Pitts (a mathematician) created the first mathematical model of how brain cells (neurons) might process information. They showed that simple on/off switches connected together could perform logical operations - the same operations computers use today.',
      historicalContext:
        'Published during World War II, this paper emerged from the intersection of neuroscience, mathematics, and the emerging field of cybernetics. It predates the term "artificial intelligence" by over a decade and laid the groundwork for both AI and modern neuroscience.',
      whyItMattersToday:
        'Every modern neural network, from GPT to image recognition systems, traces its conceptual lineage back to this paper. The idea that intelligence can emerge from simple connected units remains the core principle of deep learning.',
    },
  },
  {
    id: 'H1950_TURING_TEST',
    title: 'Alan Turing Publishes "Computing Machinery and Intelligence"',
    description:
      'Alan Turing published his landmark paper introducing the "Imitation Game" (now known as the Turing Test) as a way to evaluate machine intelligence. The paper asked "Can machines think?" and proposed a practical test: if a human interrogator cannot reliably distinguish between a human and a machine through text conversation, the machine exhibits intelligent behavior.',
    date: '1950-10-01',
    category: 'research',
    significance: 4,
    era: 'Foundations',
    organization: 'University of Manchester',
    contributors: ['Alan Turing'],
    sourceUrl: 'https://academic.oup.com/mind/article/LIX/236/433/986238',
    tags: ['turing-test', 'foundations', 'philosophy', 'intelligence'],
    layeredContent: {
      tldr: 'Turing proposed the famous "Turing Test" as a practical way to evaluate machine intelligence.',
      simpleExplanation:
        'Turing asked a profound question: How do we know if a machine is truly intelligent? His answer was practical: if you chat with a machine and cannot tell it apart from a human, then for all practical purposes, it is behaving intelligently. This test became the benchmark that AI researchers would chase for 75 years.',
      historicalContext:
        'Turing was already famous for breaking Nazi codes during WWII and for his foundational work on computation. This paper shifted focus from "what can machines calculate?" to "can machines think?" - a question that still drives AI research today.',
      whyItMattersToday:
        'The Turing Test remains the most famous benchmark for AI. When ChatGPT converses naturally with millions of users, it represents the closest we have come to passing Turing\'s original vision. The paper also anticipated many objections to AI that people still raise today.',
    },
  },
  {
    id: 'H1951_SNARC',
    title: 'First Neural Network Computer (SNARC)',
    description:
      'Marvin Minsky and Dean Edmonds built SNARC (Stochastic Neural Analog Reinforcement Calculator) at Princeton University. It was the first randomly wired neural network learning machine, using 40 Hebb synapses to simulate a neural network that could learn to navigate a maze.',
    date: '1951-06-01',
    category: 'research',
    significance: 3,
    era: 'Foundations',
    organization: 'Princeton University',
    contributors: ['Marvin Minsky', 'Dean Edmonds'],
    sourceUrl: null,
    tags: ['neural-networks', 'hardware', 'learning', 'minsky'],
    layeredContent: {
      tldr: 'First hardware neural network that could actually learn - a maze-solving machine built from vacuum tubes.',
      simpleExplanation:
        'While McCulloch-Pitts showed neural networks were theoretically possible, Minsky and Edmonds actually built one. SNARC was a room-sized machine made of vacuum tubes and motors that could learn to navigate a maze through trial and error - similar to how a mouse learns.',
      historicalContext:
        'Built for Minsky\'s PhD thesis, SNARC demonstrated that neural network learning was not just theory. Minsky would later become one of AI\'s most influential figures, though ironically his 1969 book would temporarily halt neural network research.',
      whyItMattersToday:
        'SNARC proved that machines could learn from experience, a principle at the heart of modern machine learning. The reinforcement learning approach it used is the same approach that trained AlphaGo and modern robotics.',
    },
  },
  {
    id: 'H1952_SAMUEL_CHECKERS',
    title: 'Arthur Samuel\'s Checkers Program',
    description:
      'Arthur Samuel at IBM created a checkers-playing program that could learn from experience and improve its play over time. It was one of the first programs to demonstrate machine learning and self-improvement, and Samuel coined the term "machine learning" to describe this approach.',
    date: '1952-01-01',
    category: 'research',
    significance: 3,
    era: 'Foundations',
    organization: 'IBM',
    contributors: ['Arthur Samuel'],
    sourceUrl: null,
    tags: ['machine-learning', 'games', 'ibm', 'reinforcement-learning'],
    layeredContent: {
      tldr: 'First program to learn and improve from experience - coined the term "machine learning."',
      simpleExplanation:
        'Arthur Samuel created a checkers program that could play against itself millions of times and get better. Unlike a calculator that always does the same thing, Samuel\'s program learned from its wins and losses. He called this "machine learning" - a term we still use today.',
      historicalContext:
        'This was a breakthrough moment: a program that improved without being explicitly reprogrammed. Samuel\'s checkers player eventually beat human champions, demonstrating that machines could master complex games.',
      whyItMattersToday:
        'Every modern AI that learns from data traces back to Samuel\'s insight. The same principle - learning from experience - powers everything from recommendation algorithms to autonomous vehicles.',
    },
  },
  // === BIRTH OF AI ERA (1956-1969) ===
  {
    id: 'H1956_DARTMOUTH',
    title: 'Dartmouth Conference: Birth of Artificial Intelligence',
    description:
      'The Dartmouth Summer Research Project on Artificial Intelligence, organized by John McCarthy, Marvin Minsky, Nathaniel Rochester, and Claude Shannon, was the founding event of AI as an academic discipline. The proposal coined the term "artificial intelligence" and brought together researchers who would shape the field for decades. The conference was based on the premise that "every aspect of learning or any other feature of intelligence can in principle be so precisely described that a machine can be made to simulate it."',
    date: '1956-06-18',
    category: 'breakthrough',
    significance: 4,
    era: 'Birth of AI',
    organization: 'Dartmouth College',
    contributors: ['John McCarthy', 'Marvin Minsky', 'Claude Shannon', 'Nathaniel Rochester'],
    sourceUrl: 'http://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html',
    tags: ['dartmouth', 'foundations', 'ai-history', 'mccarthy', 'minsky'],
    layeredContent: {
      tldr: 'The conference that coined "artificial intelligence" and launched AI as a formal field of study.',
      simpleExplanation:
        'Imagine the moment when a group of brilliant scientists decided to officially try building thinking machines. In 1956, about 10 researchers gathered at Dartmouth College for a summer workshop. They gave their ambitious goal a name: Artificial Intelligence. Though they were overly optimistic about how quickly they could achieve it, they launched a field that would eventually change the world.',
      historicalContext:
        'The attendees included future Turing Award winners and AI pioneers. Their optimism was enormous - they believed AI could be largely solved in a single summer. While that proved wildly optimistic, the conference established the foundational goals, methods, and community of AI research.',
      whyItMattersToday:
        'Every AI company, every machine learning model, every chatbot traces its intellectual heritage to this conference. The term "artificial intelligence" itself was born here, and the original research agenda - making machines that can learn, reason, and perceive - remains the core of AI today.',
    },
  },
  {
    id: 'H1957_PERCEPTRON',
    title: 'Frank Rosenblatt Invents the Perceptron',
    description:
      'Frank Rosenblatt at Cornell University invented the Perceptron, the first algorithm that could learn to classify patterns. Implemented on custom hardware (the Mark I Perceptron), it could learn to recognize simple shapes and letters. The New York Times reported it as the embryo of "an electronic computer that will be able to walk, talk, see, write, reproduce itself, and be conscious of its existence."',
    date: '1957-07-01',
    category: 'research',
    significance: 4,
    era: 'Birth of AI',
    organization: 'Cornell University',
    contributors: ['Frank Rosenblatt'],
    sourceUrl: null,
    tags: ['perceptron', 'neural-networks', 'learning', 'pattern-recognition'],
    layeredContent: {
      tldr: 'First algorithm that could learn to recognize patterns - the ancestor of modern neural networks.',
      simpleExplanation:
        'Rosenblatt created the perceptron - a simple machine that could learn to tell things apart, like distinguishing squares from circles. By adjusting its internal settings based on right and wrong answers, it got better over time. This was revolutionary: a machine that could learn, not just follow fixed rules.',
      historicalContext:
        'The perceptron generated enormous excitement and media hype about thinking machines. But its limitations - which would be exposed in 1969 - would later be used to argue against neural network research, triggering the first "AI Winter."',
      whyItMattersToday:
        'Every neuron in modern deep learning networks is a descendant of Rosenblatt\'s perceptron. The basic idea - adjustable weights, learning from errors - remains the foundation of all neural network training.',
    },
  },
  {
    id: 'H1958_LISP',
    title: 'John McCarthy Creates LISP',
    description:
      'John McCarthy developed LISP (List Processing), a programming language specifically designed for artificial intelligence research. LISP introduced concepts like recursive functions, garbage collection, and dynamic typing that influenced all subsequent programming languages. It remained the dominant AI programming language for over 40 years.',
    date: '1958-01-01',
    category: 'research',
    significance: 3,
    era: 'Birth of AI',
    organization: 'MIT',
    contributors: ['John McCarthy'],
    sourceUrl: null,
    tags: ['lisp', 'programming', 'languages', 'mccarthy'],
    layeredContent: {
      tldr: 'LISP became the standard programming language for AI research for over four decades.',
      simpleExplanation:
        'McCarthy realized that AI needed a new kind of programming language - one that could easily work with symbols and ideas, not just numbers. LISP was designed to manipulate lists of things (hence "list processing"), making it perfect for representing knowledge and reasoning.',
      historicalContext:
        'LISP was the second-oldest high-level programming language still in use (after FORTRAN). It spawned entire families of languages and influenced everything from Python to JavaScript. AI researchers used LISP well into the 2000s.',
      whyItMattersToday:
        'While Python has largely replaced LISP in AI, many concepts LISP pioneered (like treating code as data) remain influential. The Clojure language and Emacs text editor still use LISP-family languages today.',
    },
  },
  {
    id: 'H1966_ELIZA',
    title: 'ELIZA: First Chatbot',
    description:
      'Joseph Weizenbaum at MIT created ELIZA, one of the first natural language processing programs and the first chatbot. ELIZA simulated a Rogerian psychotherapist by using pattern matching to respond to user input. Weizenbaum was disturbed when users began attributing human-like feelings to the program, leading him to become a critic of AI.',
    date: '1966-01-01',
    category: 'product',
    significance: 3,
    era: 'Birth of AI',
    organization: 'MIT',
    contributors: ['Joseph Weizenbaum'],
    sourceUrl: null,
    tags: ['chatbot', 'nlp', 'eliza', 'mit', 'natural-language'],
    layeredContent: {
      tldr: 'First chatbot that could hold a conversation - and first demonstration that humans bond with AI.',
      simpleExplanation:
        'ELIZA was a simple program that pretended to be a therapist. When you said "I am sad," it might respond "Why are you sad?" Using simple tricks, it fooled people into thinking they were talking to something that understood them. Some users became emotionally attached to it, alarming its creator.',
      historicalContext:
        'ELIZA demonstrated both the potential and the risks of conversational AI. Weizenbaum was so disturbed by how readily people anthropomorphized the program that he wrote "Computer Power and Human Reason" warning about AI overreach.',
      whyItMattersToday:
        'ELIZA anticipated the ethical debates around ChatGPT and AI companions. The tendency of humans to attribute understanding to programs that merely pattern-match remains relevant as billions now interact with AI chatbots daily.',
    },
  },
  {
    id: 'H1969_PERCEPTRONS_BOOK',
    title: 'Minsky & Papert Publish "Perceptrons"',
    description:
      'Marvin Minsky and Seymour Papert published "Perceptrons," demonstrating fundamental limitations of single-layer perceptrons. The book proved that perceptrons could not learn certain simple functions (like XOR) without adding hidden layers. This led to a dramatic decline in neural network research funding and triggered the first "AI Winter."',
    date: '1969-01-01',
    category: 'research',
    significance: 3,
    era: 'Birth of AI',
    organization: 'MIT',
    contributors: ['Marvin Minsky', 'Seymour Papert'],
    sourceUrl: null,
    tags: ['perceptrons', 'neural-networks', 'ai-winter', 'limitations'],
    layeredContent: {
      tldr: 'Book exposing perceptron limitations that triggered the first AI Winter and halted neural network research.',
      simpleExplanation:
        'Minsky and Papert showed that perceptrons had serious limitations - they couldn\'t solve certain simple problems. While the book was technically correct, many researchers (perhaps unfairly) interpreted it as proving neural networks were a dead end. Funding dried up almost overnight.',
      historicalContext:
        'The book\'s impact was amplified by Minsky\'s stature in AI. Neural network research went dormant for over a decade. Ironically, the book\'s actual conclusion - that multi-layer networks could overcome these limitations - was largely ignored.',
      whyItMattersToday:
        'This episode is a cautionary tale about how scientific criticism can be misinterpreted. The "multi-layer" solution Minsky mentioned is exactly what powers deep learning today. The AI Winter delayed progress by perhaps 15-20 years.',
    },
  },
  // === FIRST AI WINTER (1970-1980) ===
  {
    id: 'H1973_LIGHTHILL',
    title: 'Lighthill Report Triggers AI Funding Cuts',
    description:
      'Sir James Lighthill published a devastating critique of AI research in the UK, concluding that AI had failed to achieve its ambitious goals. The "Lighthill Report" led to dramatic cuts in AI funding across the UK and contributed to the first AI Winter. It criticized AI for overpromising and underdelivering.',
    date: '1973-01-01',
    category: 'industry',
    significance: 3,
    era: 'First AI Winter',
    organization: 'UK Science Research Council',
    contributors: ['James Lighthill'],
    sourceUrl: null,
    tags: ['ai-winter', 'funding', 'uk', 'criticism'],
    layeredContent: {
      tldr: 'UK government report declaring AI a failure, triggering massive funding cuts.',
      simpleExplanation:
        'The British government asked mathematician James Lighthill to evaluate AI research. His report concluded that AI had failed to deliver on its grand promises. As a result, the UK essentially shut down AI research for years, and other countries followed suit.',
      historicalContext:
        'The Lighthill Report reflected genuine frustration with AI\'s lack of practical results after 15 years of funding. Combined with Perceptrons and DARPA cuts in the US, it marked the beginning of the first AI Winter.',
      whyItMattersToday:
        'The cycle of hype, disappointment, and reduced funding has repeated in AI\'s history. Understanding these "AI Winters" helps contextualize current excitement around AI and the importance of managing expectations.',
    },
  },
  {
    id: 'H1974_BACKPROP_WERBOS',
    title: 'Backpropagation Algorithm Invented',
    description:
      'Paul Werbos introduced backpropagation in his PhD thesis, providing a method to train multi-layer neural networks by propagating errors backward through the network. Though largely ignored at the time due to the AI Winter, this algorithm would later become the foundation of deep learning.',
    date: '1974-01-01',
    category: 'research',
    significance: 4,
    era: 'First AI Winter',
    organization: 'Harvard University',
    contributors: ['Paul Werbos'],
    sourceUrl: null,
    tags: ['backpropagation', 'neural-networks', 'training', 'deep-learning'],
    layeredContent: {
      tldr: 'Invention of backpropagation - the algorithm that would eventually power all deep learning.',
      simpleExplanation:
        'Backpropagation solved a crucial problem: how do you train a neural network with multiple layers? The answer was to work backward from errors, adjusting each layer\'s settings step by step. This simple but powerful idea would later revolutionize AI.',
      historicalContext:
        'Werbos\'s work was largely ignored during the AI Winter. The algorithm would be independently rediscovered and popularized by Rumelhart, Hinton, and Williams in 1986, finally receiving the attention it deserved.',
      whyItMattersToday:
        'Virtually every neural network today - from GPT to self-driving cars - is trained using backpropagation. It remains the most important algorithm in deep learning, enabling networks with billions of parameters.',
    },
  },
  // === EXPERT SYSTEMS ERA (1980-1987) ===
  {
    id: 'H1980_R1_XCON',
    title: 'R1/XCON Expert System Deployed at DEC',
    description:
      'Digital Equipment Corporation deployed R1 (later XCON), an expert system that configured VAX computer orders. It was one of the first commercially successful AI applications, saving DEC an estimated $40 million annually. R1\'s success sparked the expert systems boom of the 1980s.',
    date: '1980-01-01',
    category: 'product',
    significance: 3,
    era: 'Expert Systems',
    organization: 'Digital Equipment Corporation',
    contributors: ['John McDermott'],
    sourceUrl: null,
    tags: ['expert-systems', 'commercial-ai', 'dec', 'xcon'],
    layeredContent: {
      tldr: 'First major commercial AI success - an expert system that saved $40M annually.',
      simpleExplanation:
        'DEC sold computers with many configurable options. R1 encoded the knowledge of expert salespeople as rules, automatically configuring orders. It worked so well that companies across industries rushed to build their own expert systems.',
      historicalContext:
        'R1\'s success triggered massive corporate investment in AI. Companies like Symbolics sold specialized AI computers, and expert systems were hailed as the future of business software. This boom would collapse by the late 1980s.',
      whyItMattersToday:
        'Expert systems showed that AI could have immediate business value. Modern AI systems still encode domain expertise, though now through machine learning rather than hand-crafted rules.',
    },
  },
  {
    id: 'H1982_FIFTH_GEN',
    title: 'Japan Launches Fifth Generation Computer Project',
    description:
      'Japan\'s Ministry of International Trade and Industry announced an ambitious 10-year plan to develop "fifth generation" computers with AI capabilities. The project aimed to create machines capable of conversation, translation, and reasoning. It triggered a global AI race with massive government investments in the US and Europe.',
    date: '1982-04-01',
    category: 'industry',
    significance: 3,
    era: 'Expert Systems',
    organization: 'MITI Japan',
    contributors: [],
    sourceUrl: null,
    tags: ['japan', 'government', 'fifth-generation', 'funding'],
    layeredContent: {
      tldr: 'Japan\'s ambitious AI project that triggered a global AI arms race.',
      simpleExplanation:
        'Japan announced they would build a new kind of computer that could think. This scared Western governments into massively funding their own AI research. The "Fifth Generation" project ultimately failed to achieve its goals, but it drove a decade of AI investment worldwide.',
      historicalContext:
        'The project reflected Cold War-era technology competition. The US responded with the Strategic Computing Initiative, and European countries launched similar programs. The eventual failure contributed to the second AI Winter.',
      whyItMattersToday:
        'The pattern of AI nationalism - countries racing to lead in AI - continues today. China\'s AI initiatives and US responses echo the Fifth Generation competition.',
    },
  },
  {
    id: 'H1986_BACKPROP_PAPER',
    title: 'Backpropagation Popularized by Rumelhart, Hinton, and Williams',
    description:
      'David Rumelhart, Geoffrey Hinton, and Ronald Williams published "Learning representations by back-propagating errors" in Nature, bringing backpropagation to mainstream attention. The paper showed that multi-layer neural networks could learn complex representations, challenging the pessimism from Perceptrons.',
    date: '1986-10-09',
    category: 'research',
    significance: 4,
    era: 'Expert Systems',
    organization: null,
    contributors: ['David Rumelhart', 'Geoffrey Hinton', 'Ronald Williams'],
    sourceUrl: 'https://www.nature.com/articles/323533a0',
    tags: ['backpropagation', 'neural-networks', 'hinton', 'deep-learning'],
    layeredContent: {
      tldr: 'Paper that revived neural networks by demonstrating practical multi-layer learning.',
      simpleExplanation:
        'This paper showed that multi-layer neural networks could actually work, using backpropagation to train them. It answered the challenge from "Perceptrons" and began the slow revival of neural network research.',
      historicalContext:
        'Though backpropagation was invented earlier, this paper made it accessible and demonstrated its power. Hinton would continue neural network research through the second AI Winter, eventually leading the deep learning revolution.',
      whyItMattersToday:
        'This paper is the direct ancestor of modern deep learning. Hinton would later win the Turing Award for this and subsequent work on neural networks.',
    },
  },
  // === SECOND AI WINTER (1987-1993) ===
  {
    id: 'H1987_EXPERT_COLLAPSE',
    title: 'Expert Systems Market Collapses',
    description:
      'The market for specialized AI hardware and expert systems software collapsed dramatically. Symbolics, once valued at over $100 million, and other AI companies went bankrupt. The failure of expert systems to scale and the end of the Fifth Generation project triggered the second AI Winter.',
    date: '1987-01-01',
    category: 'industry',
    significance: 3,
    era: 'Second AI Winter',
    organization: null,
    contributors: [],
    sourceUrl: null,
    tags: ['ai-winter', 'expert-systems', 'market-crash', 'symbolics'],
    layeredContent: {
      tldr: 'AI industry collapse as expert systems fail to deliver on promises.',
      simpleExplanation:
        'Companies had spent billions on expert systems that were hard to maintain and couldn\'t adapt to change. When cheaper desktop computers could do most tasks, the specialized AI hardware market disappeared. The second AI Winter began.',
      historicalContext:
        'The expert systems boom had created unrealistic expectations. When systems proved brittle and expensive, investment dried up. AI became a "dirty word" in many corporate circles.',
      whyItMattersToday:
        'The expert systems collapse shows how overhype can damage a field. Current AI developers study this period to avoid repeating its mistakes.',
    },
  },
  // === STATISTICAL ML ERA (1993-2006) ===
  {
    id: 'H1995_SVM',
    title: 'Support Vector Machines Published',
    description:
      'Vladimir Vapnik and Corinna Cortes published their work on Support Vector Machines (SVMs), providing a powerful and theoretically grounded method for classification. SVMs became the dominant machine learning method for many tasks in the 1990s and 2000s.',
    date: '1995-09-01',
    category: 'research',
    significance: 3,
    era: 'Statistical ML',
    organization: 'AT&T Bell Labs',
    contributors: ['Vladimir Vapnik', 'Corinna Cortes'],
    sourceUrl: null,
    tags: ['svm', 'machine-learning', 'classification', 'statistical-learning'],
    layeredContent: {
      tldr: 'SVMs became the dominant machine learning method for classification in the 1990s-2000s.',
      simpleExplanation:
        'Support Vector Machines found the best way to separate different categories of data. They were mathematically elegant and worked well on many problems. For over a decade, SVMs were the go-to method for machine learning.',
      historicalContext:
        'SVMs represented the "statistical machine learning" approach that dominated during the second AI Winter. They avoided neural networks\' reputation for being unreliable and theoretically murky.',
      whyItMattersToday:
        'Though deep learning has largely supplanted SVMs, they remain useful for smaller datasets and serve as benchmarks. Their mathematical foundations influenced neural network theory.',
    },
  },
  {
    id: 'H1997_DEEP_BLUE',
    title: 'IBM Deep Blue Defeats Garry Kasparov',
    description:
      'IBM\'s Deep Blue became the first computer to defeat a reigning world chess champion (Garry Kasparov) in a match under standard time controls. The victory was a landmark achievement in AI, demonstrating that machines could master complex strategic games previously thought to require human intuition.',
    date: '1997-05-11',
    category: 'breakthrough',
    significance: 4,
    era: 'Statistical ML',
    organization: 'IBM',
    contributors: ['Murray Campbell', 'Feng-hsiung Hsu', 'Garry Kasparov'],
    sourceUrl: null,
    tags: ['chess', 'ibm', 'deep-blue', 'games', 'kasparov'],
    layeredContent: {
      tldr: 'First computer to beat a world chess champion - a watershed moment for AI.',
      simpleExplanation:
        'For decades, chess was the benchmark for AI. When IBM\'s Deep Blue defeated Garry Kasparov, the world\'s best chess player, it proved machines could master games of strategy. It was front-page news worldwide.',
      historicalContext:
        'Deep Blue used brute-force search and specialized chess hardware rather than learning. The victory was somewhat pyrrhic - it showed computers could excel at chess but didn\'t advance "thinking" AI.',
      whyItMattersToday:
        'Deep Blue shifted public perception of AI possibilities. It set the stage for later game-playing achievements like AlphaGo, though those used very different (learning-based) methods.',
    },
  },
  {
    id: 'H1998_LENET',
    title: 'Yann LeCun Deploys LeNet for Handwriting Recognition',
    description:
      'Yann LeCun and colleagues at AT&T Bell Labs developed LeNet-5, a convolutional neural network for handwritten digit recognition that was deployed commercially for reading checks. LeNet demonstrated that neural networks could achieve practical, commercial success.',
    date: '1998-01-01',
    category: 'product',
    significance: 3,
    era: 'Statistical ML',
    organization: 'AT&T Bell Labs',
    contributors: ['Yann LeCun', 'Leon Bottou', 'Yoshua Bengio', 'Patrick Haffner'],
    sourceUrl: null,
    tags: ['cnn', 'lenet', 'computer-vision', 'lecun', 'handwriting'],
    layeredContent: {
      tldr: 'First commercial deployment of convolutional neural networks - reading checks by the millions.',
      simpleExplanation:
        'LeCun created a neural network that could read handwritten numbers on checks. Banks used it to process millions of checks automatically. This quiet success kept neural network research alive during the AI Winter.',
      historicalContext:
        'While most researchers avoided neural networks, LeCun, Hinton, and Bengio continued refining them. LeNet\'s architecture - convolutional layers followed by pooling - became the template for modern image recognition.',
      whyItMattersToday:
        'LeNet was the ancestor of all modern convolutional neural networks. Its architecture directly influenced AlexNet and every image AI that followed.',
    },
  },
  {
    id: 'H2001_RANDOM_FORESTS',
    title: 'Random Forests Algorithm Published',
    description:
      'Leo Breiman published the Random Forests algorithm, an ensemble method that combined multiple decision trees for robust prediction. Random Forests became one of the most widely used machine learning algorithms, prized for their accuracy and resistance to overfitting.',
    date: '2001-01-01',
    category: 'research',
    significance: 3,
    era: 'Statistical ML',
    organization: 'UC Berkeley',
    contributors: ['Leo Breiman'],
    sourceUrl: null,
    tags: ['random-forests', 'ensemble', 'machine-learning', 'classification'],
    layeredContent: {
      tldr: 'Random Forests became one of the most reliable machine learning algorithms for two decades.',
      simpleExplanation:
        'Instead of using one decision tree, Random Forests use many trees and let them vote. This simple idea works remarkably well and is still widely used today when you need reliable predictions without the complexity of deep learning.',
      historicalContext:
        'Random Forests represented the peak of "classical" machine learning - powerful, interpretable, and reliable. They dominated Kaggle competitions until deep learning took over.',
      whyItMattersToday:
        'Random Forests remain popular for tabular data and situations where interpretability matters. They are still the first choice for many practical machine learning applications.',
    },
  },
  {
    id: 'H2006_NETFLIX_PRIZE',
    title: 'Netflix Prize Competition Announced',
    description:
      'Netflix announced a $1 million prize for anyone who could improve their movie recommendation algorithm by 10%. The competition attracted thousands of data scientists and helped establish machine learning as a valuable business tool, while demonstrating the power of ensemble methods.',
    date: '2006-10-02',
    category: 'industry',
    significance: 3,
    era: 'Statistical ML',
    organization: 'Netflix',
    contributors: [],
    sourceUrl: null,
    tags: ['netflix', 'recommendations', 'competition', 'collaborative-filtering'],
    layeredContent: {
      tldr: 'Competition that proved machine learning could drive business value - and launched modern data science.',
      simpleExplanation:
        'Netflix offered $1 million to anyone who could improve their recommendations. Thousands of researchers competed, developing techniques that would influence recommendation systems everywhere. It showed companies that machine learning was worth investing in.',
      historicalContext:
        'The Netflix Prize helped legitimize machine learning as a business discipline. Many techniques developed for the competition - matrix factorization, ensemble methods - became industry standards.',
      whyItMattersToday:
        'The Netflix Prize helped create the modern "data science" profession. Its influence extends to every recommendation system you encounter today.',
    },
  },
  // === DEEP LEARNING DAWN (2006-2012) ===
  {
    id: 'H2006_DBN',
    title: 'Hinton Publishes Deep Belief Networks Paper',
    description:
      'Geoffrey Hinton and colleagues published "A Fast Learning Algorithm for Deep Belief Nets," demonstrating that deep neural networks could be effectively trained using layer-by-layer pretraining. This paper marked the beginning of the deep learning era and proved that deep networks could work.',
    date: '2006-07-01',
    category: 'research',
    significance: 4,
    era: 'Deep Learning Dawn',
    organization: 'University of Toronto',
    contributors: ['Geoffrey Hinton', 'Simon Osindero', 'Yee-Whye Teh'],
    sourceUrl: null,
    tags: ['deep-learning', 'dbn', 'hinton', 'pretraining', 'neural-networks'],
    layeredContent: {
      tldr: 'Paper that proved deep neural networks could work - launching the deep learning revolution.',
      simpleExplanation:
        'For years, people said deep neural networks couldn\'t be trained. Hinton proved them wrong with a clever trick: train one layer at a time, then fine-tune the whole network. This breakthrough launched the deep learning era.',
      historicalContext:
        'Hinton had been working on neural networks through both AI Winters. This paper vindicated decades of persistence and attracted new researchers to the field.',
      whyItMattersToday:
        'This paper is credited with starting the deep learning revolution. Hinton would later share the Turing Award for this and subsequent deep learning work.',
    },
  },
  {
    id: 'H2009_IMAGENET',
    title: 'ImageNet Dataset Created',
    description:
      'Fei-Fei Li and colleagues at Stanford created ImageNet, a massive database of over 14 million labeled images organized according to WordNet hierarchy. ImageNet became the benchmark for computer vision and enabled the deep learning breakthrough that would come in 2012.',
    date: '2009-06-01',
    category: 'research',
    significance: 4,
    era: 'Deep Learning Dawn',
    organization: 'Stanford University',
    contributors: ['Fei-Fei Li', 'Jia Deng', 'Wei Dong', 'Richard Socher', 'Li-Jia Li'],
    sourceUrl: null,
    tags: ['imagenet', 'dataset', 'computer-vision', 'fei-fei-li', 'stanford'],
    layeredContent: {
      tldr: 'Massive image database that enabled the deep learning revolution in computer vision.',
      simpleExplanation:
        'Fei-Fei Li realized that AI needed massive amounts of training data. Her team spent years labeling millions of images - what a cat looks like, what a dog looks like, and so on. This dataset became the proving ground for deep learning.',
      historicalContext:
        'ImageNet was controversial initially - many thought hand-labeling millions of images was a waste of time. But it proved essential for training the neural networks that would revolutionize computer vision.',
      whyItMattersToday:
        'ImageNet established the paradigm of large-scale datasets for AI training. Its annual competition directly led to AlexNet and the deep learning revolution.',
    },
  },
  {
    id: 'H2012_ALEXNET',
    title: 'AlexNet Wins ImageNet Competition',
    description:
      'Alex Krizhevsky, Ilya Sutskever, and Geoffrey Hinton\'s AlexNet won the ImageNet Large Scale Visual Recognition Challenge by a stunning margin, reducing the error rate from 26% to 16%. This demonstrated that deep convolutional neural networks, trained on GPUs, could dramatically outperform traditional computer vision methods.',
    date: '2012-09-30',
    category: 'breakthrough',
    significance: 4,
    era: 'Deep Learning Dawn',
    organization: 'University of Toronto',
    contributors: ['Alex Krizhevsky', 'Ilya Sutskever', 'Geoffrey Hinton'],
    sourceUrl: null,
    tags: ['alexnet', 'imagenet', 'deep-learning', 'cnn', 'gpu', 'computer-vision'],
    layeredContent: {
      tldr: 'AlexNet\'s ImageNet victory proved deep learning worked - the moment everything changed.',
      simpleExplanation:
        'Every year, researchers competed to build the best image recognition system. In 2012, Hinton\'s students crushed the competition using a deep neural network trained on GPUs. The improvement was so dramatic that the entire field pivoted to deep learning almost overnight.',
      historicalContext:
        'AlexNet combined several innovations: deep convolutional networks, GPU training, ReLU activations, and dropout. Its victory convinced skeptics that deep learning was the future.',
      whyItMattersToday:
        'AlexNet is the inflection point of modern AI. Every image recognition system, every modern AI breakthrough traces back to this moment. Sutskever would later co-found OpenAI.',
    },
  },
  {
    id: 'H2012_GOOGLE_BRAIN_CAT',
    title: 'Google Brain Learns to Recognize Cats',
    description:
      'Google Brain, led by Andrew Ng and Jeff Dean, demonstrated that a massive neural network trained on 10 million YouTube video thumbnails could learn to recognize cats without being told what a cat was. This unsupervised learning achievement showed that deep networks could discover meaningful concepts from raw data.',
    date: '2012-06-25',
    category: 'research',
    significance: 3,
    era: 'Deep Learning Dawn',
    organization: 'Google',
    contributors: ['Andrew Ng', 'Jeff Dean', 'Quoc Le'],
    sourceUrl: null,
    tags: ['google-brain', 'unsupervised', 'deep-learning', 'google', 'andrew-ng'],
    layeredContent: {
      tldr: 'Google\'s neural network learned what a cat looks like without being told - from 10 million YouTube videos.',
      simpleExplanation:
        'Google fed millions of YouTube screenshots to a massive neural network. Without being told anything about cats, the network developed neurons that responded specifically to cat faces. It had discovered the concept of "cat" on its own.',
      historicalContext:
        'This project showed that large-scale computing could enable new AI capabilities. It was one of the first demonstrations of what would become Google\'s AI dominance.',
      whyItMattersToday:
        'The Google Brain cat experiment demonstrated that scale matters in deep learning. This insight would drive the development of ever-larger models, culminating in GPT and other foundation models.',
    },
  },
];

/**
 * Main seeding function
 */
async function seedHistoricalMilestones() {
  console.log('Starting historical milestones seed...');
  console.log(`Database: ${connectionString?.split('@')[1] || 'hidden'}`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const milestone of HISTORICAL_MILESTONES) {
    try {
      // Check if milestone already exists
      const existing = await prisma.milestone.findUnique({
        where: { id: milestone.id },
      });

      if (existing) {
        console.log(`  [SKIP] ${milestone.id} already exists`);
        skipped++;
        continue;
      }

      // Create the milestone
      await prisma.milestone.create({
        data: {
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          date: new Date(milestone.date),
          category: milestone.category,
          significance: milestone.significance,
          era: milestone.era,
          organization: milestone.organization,
          contributors: JSON.stringify(milestone.contributors),
          sourceUrl: milestone.sourceUrl,
          tags: JSON.stringify(milestone.tags),
          sources: JSON.stringify([]),
          tldr: milestone.layeredContent.tldr,
          simpleExplanation: milestone.layeredContent.simpleExplanation,
          historicalContext: milestone.layeredContent.historicalContext,
          whyItMattersToday: milestone.layeredContent.whyItMattersToday,
        },
      });

      console.log(`  [CREATED] ${milestone.id}: ${milestone.title}`);
      created++;
    } catch (error) {
      console.error(`  [ERROR] ${milestone.id}: ${error}`);
      errors++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total milestones in script: ${HISTORICAL_MILESTONES.length}`);

  await prisma.$disconnect();
}

// Run the seed
seedHistoricalMilestones()
  .then(() => {
    console.log('\nHistorical milestones seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
