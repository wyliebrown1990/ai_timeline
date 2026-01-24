/**
 * Sprint TD-3: Historical Depth Expansion
 * Seeds historical AI figures via the production API
 *
 * Usage: ADMIN_PASSWORD='...' npx tsx scripts/seedHistoricalFigures.ts
 */

const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod';

interface HistoricalFigure {
  canonicalName: string;
  aliases?: string[];
  shortBio: string;
  background?: string;
  careerHistory?: string;
  contributions?: string;
  philosophy?: string;
  role: 'researcher' | 'executive' | 'founder' | 'policy_maker' | 'engineer' | 'other';
  focusAreas?: string[];
  wikipediaUrl?: string;
  imageUrl?: string;
}

const HISTORICAL_FIGURES: HistoricalFigure[] = [
  {
    canonicalName: 'Alan Turing',
    aliases: ['Alan Mathison Turing', 'A.M. Turing'],
    shortBio: 'British mathematician and computer scientist, father of theoretical computer science and artificial intelligence. Created the Turing Test as a measure of machine intelligence.',
    background: 'Born June 23, 1912 in London. Studied mathematics at King\'s College, Cambridge, earning first-class honors. Completed his PhD at Princeton under Alonzo Church. During WWII, worked at Bletchley Park breaking Nazi Enigma codes, making crucial contributions to Allied victory.',
    careerHistory: 'Fellow at King\'s College, Cambridge (1935-1936). PhD at Princeton (1936-1938). Cryptanalyst at Bletchley Park (1939-1945). National Physical Laboratory (1945-1948). University of Manchester (1948-1954). Designed the ACE computer and worked on early AI and morphogenesis.',
    contributions: 'Invented the concept of the Turing Machine (1936), proving fundamental limits of computation. Proposed the Turing Test (1950) as a criterion for machine intelligence. Co-developed the Bombe machine that cracked Enigma. Pioneered work on morphogenesis and mathematical biology.',
    philosophy: 'Believed that machines could be made to think, famously arguing against various objections in his 1950 paper. Advocated for an operational definition of intelligence rather than philosophical debates about consciousness.',
    role: 'researcher',
    focusAreas: ['computation theory', 'artificial intelligence', 'cryptography', 'mathematical biology'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Alan_Turing',
  },
  {
    canonicalName: 'John McCarthy',
    aliases: ['John McCarthy (computer scientist)'],
    shortBio: 'American computer scientist who coined the term "artificial intelligence" and organized the 1956 Dartmouth Conference. Invented LISP programming language.',
    background: 'Born September 4, 1927 in Boston. Studied mathematics at Caltech and Princeton. Received PhD from Princeton in 1951 under Solomon Lefschetz.',
    careerHistory: 'Dartmouth College (1955-1958) where he organized the founding AI conference. MIT (1958-1962) where he founded the AI Lab with Marvin Minsky. Stanford (1962-2000) where he founded the Stanford AI Laboratory (SAIL). Emeritus until death in 2011.',
    contributions: 'Coined "artificial intelligence" in 1955. Organized the 1956 Dartmouth Conference that established AI as a field. Invented LISP (1958), the second-oldest high-level programming language still in use. Pioneered time-sharing computing. Introduced the concept of utility computing (cloud computing precursor).',
    philosophy: 'Advocated for symbolic AI and logic-based reasoning. Believed in building AI through explicit knowledge representation and formal logic. Optimistic about AI potential but realistic about timelines.',
    role: 'researcher',
    focusAreas: ['artificial intelligence', 'programming languages', 'logic', 'time-sharing'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/John_McCarthy_(computer_scientist)',
  },
  {
    canonicalName: 'Marvin Minsky',
    aliases: ['Marvin Lee Minsky'],
    shortBio: 'American cognitive scientist and co-founder of MIT\'s AI Laboratory. Pioneer of artificial intelligence, neural networks, and the philosophy of mind.',
    background: 'Born August 9, 1927 in New York City. Studied mathematics and physics at Harvard, then earned PhD in mathematics from Princeton in 1954. Served in the US Navy during WWII.',
    careerHistory: 'Harvard Junior Fellow (1954-1957). MIT Lincoln Laboratory (1957-1958). MIT Professor (1958-2016). Co-founded MIT AI Lab with John McCarthy in 1959. Media Lab founding member. Continued research until death in 2016.',
    contributions: 'Built SNARC, the first neural network computer (1951). Co-authored "Perceptrons" (1969) analyzing neural network limitations. Invented head-mounted graphical display. Developed frames theory for knowledge representation. Founded MIT AI Lab. Pioneered theories of mind in "Society of Mind" (1986).',
    philosophy: 'Viewed the mind as a "society" of simple agents. Initially skeptical of neural networks after Perceptrons analysis, but later acknowledged their potential. Believed intelligence emerges from the interaction of many simple processes.',
    role: 'researcher',
    focusAreas: ['artificial intelligence', 'cognitive science', 'neural networks', 'robotics', 'philosophy of mind'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Marvin_Minsky',
  },
  {
    canonicalName: 'Claude Shannon',
    aliases: ['Claude Elwood Shannon'],
    shortBio: 'American mathematician and electrical engineer, known as the "father of information theory." Co-organized the Dartmouth Conference and pioneered digital circuit design.',
    background: 'Born April 30, 1916 in Michigan. Dual degrees in mathematics and electrical engineering from University of Michigan. PhD from MIT in 1940, where his thesis proved Boolean algebra could optimize telephone switching circuits.',
    careerHistory: 'Bell Labs (1941-1972) where he developed information theory. MIT Professor (1956-1978). Consultant to various organizations. Known for building quirky machines including a maze-solving mouse and juggling robots.',
    contributions: 'Founded information theory with "A Mathematical Theory of Communication" (1948), introducing the bit as a unit of information. Proved fundamental limits on data compression and error-correcting codes. Co-organized Dartmouth Conference (1956). Pioneered digital circuit design theory.',
    philosophy: 'Approached problems playfully and with mathematical rigor. Believed in finding elegant solutions to fundamental problems. Famous for working on problems purely for intellectual curiosity rather than practical applications.',
    role: 'researcher',
    focusAreas: ['information theory', 'digital circuits', 'cryptography', 'artificial intelligence'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Claude_Shannon',
  },
  {
    canonicalName: 'Frank Rosenblatt',
    aliases: ['Frank Rosenblatt (psychologist)'],
    shortBio: 'American psychologist who invented the Perceptron, the first algorithm that could learn from data. Pioneered neural network research in the late 1950s.',
    background: 'Born July 11, 1928 in New York. Studied at Cornell University, earning PhD in psychology in 1956. Combined interests in neuroscience, psychology, and computing.',
    careerHistory: 'Cornell Aeronautical Laboratory (1957-1966). Cornell University Psychology Department (1966-1971). Died in a boating accident in 1971 at age 43, cutting short a promising career.',
    contributions: 'Invented the Perceptron (1957), the first algorithm that could learn to classify patterns from examples. Built the Mark I Perceptron hardware. Published "Principles of Neurodynamics" (1962). Demonstrated that machines could learn, inspiring decades of neural network research.',
    philosophy: 'Believed the brain\'s learning mechanisms could be modeled mathematically and implemented in hardware. Optimistic about neural networks despite criticism, predicting they would eventually prove powerful.',
    role: 'researcher',
    focusAreas: ['neural networks', 'machine learning', 'cognitive science', 'pattern recognition'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Frank_Rosenblatt',
  },
  {
    canonicalName: 'Geoffrey Hinton',
    aliases: ['Geoff Hinton', 'Geoffrey Everest Hinton'],
    shortBio: 'British-Canadian cognitive scientist known as the "Godfather of Deep Learning." Pioneer of backpropagation, deep belief networks, and modern neural networks. 2024 Nobel Prize in Physics.',
    background: 'Born December 6, 1947 in London. Great-great-grandson of mathematician George Boole. Studied experimental psychology at Cambridge, then earned PhD in artificial intelligence from Edinburgh in 1978.',
    careerHistory: 'Carnegie Mellon University (1982-1987). University of Toronto (1987-present). Distinguished Researcher at Google Brain (2013-2023). Left Google in 2023 to speak freely about AI risks.',
    contributions: 'Co-authored the landmark backpropagation paper (1986) that revived neural networks. Invented deep belief networks (2006), kickstarting the deep learning revolution. Co-invented Boltzmann machines. Supervised AlexNet creators. Pioneered dropout regularization. Won 2018 Turing Award and 2024 Nobel Prize in Physics.',
    philosophy: 'Long believed that neural networks were the path to AI despite decades of skepticism. Became concerned about AI safety and existential risks, leaving Google to warn about dangers of rapidly advancing AI.',
    role: 'researcher',
    focusAreas: ['deep learning', 'neural networks', 'machine learning', 'cognitive science', 'AI safety'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Geoffrey_Hinton',
  },
  {
    canonicalName: 'Yann LeCun',
    aliases: ['Yann André LeCun'],
    shortBio: 'French-American computer scientist who pioneered convolutional neural networks (CNNs). Chief AI Scientist at Meta. 2018 Turing Award winner.',
    background: 'Born July 8, 1960 in Paris. Studied engineering at ESIEE Paris. PhD from Université Pierre et Marie Curie in 1987 under Françoise Fogelman-Soulié.',
    careerHistory: 'University of Toronto postdoc with Hinton (1987-1988). Bell Labs (1988-2003) where he developed LeNet. NYU Professor (2003-present). Director of Facebook/Meta AI Research (2013-2018). Chief AI Scientist at Meta (2018-present).',
    contributions: 'Invented convolutional neural networks (CNNs), the foundation of modern computer vision. Developed LeNet-5 (1998) for reading handwritten checks. Pioneered self-supervised learning. Advocated for energy-based models. Co-developed DjVu image compression. Won 2018 Turing Award with Hinton and Bengio.',
    philosophy: 'Believes in self-supervised learning as the path to human-level AI. Skeptical of current large language models achieving true understanding. Advocates for "world models" that learn physics and common sense.',
    role: 'researcher',
    focusAreas: ['computer vision', 'deep learning', 'convolutional neural networks', 'self-supervised learning'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Yann_LeCun',
  },
  {
    canonicalName: 'Yoshua Bengio',
    aliases: ['Yoshua Bengio (computer scientist)'],
    shortBio: 'Canadian computer scientist known for work on deep learning, neural language models, and attention mechanisms. 2018 Turing Award winner.',
    background: 'Born March 5, 1964 in Paris. Moved to Montreal as a child. PhD in computer science from McGill University in 1991.',
    careerHistory: 'MIT postdoc (1991-1992). AT&T Bell Labs (1992). Université de Montréal Professor (1993-present). Founder and Scientific Director of Mila (Montreal Institute for Learning Algorithms). Co-founder of Element AI (acquired by ServiceNow).',
    contributions: 'Pioneered neural language models and word embeddings. Co-authored foundational deep learning papers and textbooks. Advanced attention mechanisms leading to transformers. Key figure in neural machine translation. Won 2018 Turing Award with Hinton and LeCun.',
    philosophy: 'Strongly advocates for AI safety research. Believes AI development should benefit humanity and be carefully governed. Supports open research while acknowledging dual-use risks.',
    role: 'researcher',
    focusAreas: ['deep learning', 'natural language processing', 'neural language models', 'AI safety'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Yoshua_Bengio',
  },
  {
    canonicalName: 'Fei-Fei Li',
    aliases: ['Li Fei-Fei', 'Fei-Fei Li (computer scientist)'],
    shortBio: 'Chinese-American computer scientist who created ImageNet, the dataset that sparked the deep learning revolution. Pioneer in computer vision and human-centered AI.',
    background: 'Born 1976 in Beijing. Immigrated to the US at age 15, learning English while working in Chinese restaurants. Physics degree from Princeton, PhD in electrical engineering from Caltech (2005).',
    careerHistory: 'University of Illinois (2005-2006). Princeton (2006-2009). Stanford Professor (2009-present). Director of Stanford AI Lab (2013-2018). Chief Scientist at Google Cloud (2017-2018). Co-Director of Stanford Human-Centered AI Institute.',
    contributions: 'Led creation of ImageNet (2009), the massive labeled image database. ImageNet Challenge became the benchmark where deep learning proved itself (AlexNet 2012). Pioneered visual recognition and scene understanding. Advocates for human-centered AI and AI ethics.',
    philosophy: 'Believes AI should be developed to benefit all of humanity, not just tech companies. Emphasizes diversity in AI research. Advocates for AI that augments human capabilities rather than replacing humans.',
    role: 'researcher',
    focusAreas: ['computer vision', 'machine learning', 'ImageNet', 'human-centered AI', 'AI ethics'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Fei-Fei_Li',
  },
  {
    canonicalName: 'Joseph Weizenbaum',
    aliases: ['Joseph Weizenbaum (computer scientist)'],
    shortBio: 'German-American computer scientist who created ELIZA, one of the first chatbots. Became a prominent critic of AI and its social implications.',
    background: 'Born January 8, 1923 in Berlin. Fled Nazi Germany with his family in 1936. Studied mathematics at Wayne State University. Served in the US Army during WWII.',
    careerHistory: 'General Electric (1950s). MIT Professor (1963-1988). Created ELIZA in 1966. Spent later career critiquing AI and computer technology. Returned to Berlin, where he died in 2008.',
    contributions: 'Created ELIZA (1966), a program that simulated a Rogerian therapist using simple pattern matching. Demonstrated how easily humans anthropomorphize machines. His book "Computer Power and Human Reason" (1976) became a classic critique of AI.',
    philosophy: 'Became alarmed when users formed emotional attachments to ELIZA. Argued that some tasks should never be delegated to computers. Criticized AI researchers for not considering ethical implications of their work.',
    role: 'researcher',
    focusAreas: ['natural language processing', 'human-computer interaction', 'AI ethics', 'philosophy of technology'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Joseph_Weizenbaum',
  },
  {
    canonicalName: 'Paul Werbos',
    aliases: ['Paul John Werbos'],
    shortBio: 'American mathematician who first described the backpropagation algorithm in his 1974 PhD thesis. Pioneered reinforcement learning concepts.',
    background: 'Born 1947. Studied at Harvard and the London School of Economics. PhD in applied mathematics from Harvard in 1974.',
    careerHistory: 'US Department of Energy. National Science Foundation Program Director. Independent researcher and consultant. Continued working on neural networks and energy policy.',
    contributions: 'First described backpropagation in his 1974 PhD thesis "Beyond Regression: New Tools for Prediction and Analysis in the Behavioral Sciences." Pioneered approximate dynamic programming and reinforcement learning concepts.',
    philosophy: 'Believed neural networks were the key to AI and persisted despite the field being out of fashion. Advocated for brain-like computing approaches decades before deep learning became mainstream.',
    role: 'researcher',
    focusAreas: ['neural networks', 'backpropagation', 'reinforcement learning', 'dynamic programming'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Paul_Werbos',
  },
  {
    canonicalName: 'Alex Krizhevsky',
    aliases: ['Alexander Krizhevsky'],
    shortBio: 'Ukrainian-Canadian computer scientist who created AlexNet, the deep neural network that won ImageNet 2012 and launched the deep learning revolution.',
    background: 'Born in Ukraine (then USSR). Moved to Canada. Studied computer science at University of Toronto under Geoffrey Hinton.',
    careerHistory: 'PhD student at University of Toronto (2009-2014). Google (2013-2017). Created AlexNet while a graduate student, fundamentally changing the field of AI.',
    contributions: 'Designed and trained AlexNet (2012), the deep convolutional neural network that crushed the ImageNet competition with a 10+ percentage point improvement. Demonstrated the power of GPUs for training deep networks. Co-authored one of the most cited AI papers ever.',
    philosophy: 'Showed that scale (deeper networks, more data, GPU training) could dramatically improve AI performance. Pioneered practical techniques like ReLU activations and dropout.',
    role: 'researcher',
    focusAreas: ['deep learning', 'computer vision', 'GPU computing', 'convolutional neural networks'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Alex_Krizhevsky',
  },
  {
    canonicalName: 'Ilya Sutskever',
    aliases: ['Ilya Sutskever (computer scientist)'],
    shortBio: 'Israeli-Canadian AI researcher, co-founder and former Chief Scientist of OpenAI. Key contributor to AlexNet and sequence-to-sequence learning.',
    background: 'Born 1985 in Russia, grew up in Israel, moved to Canada at age 5. PhD from University of Toronto under Geoffrey Hinton.',
    careerHistory: 'Postdoc at Stanford with Andrew Ng. Google Brain (2012-2015). Co-founded OpenAI (2015). Chief Scientist at OpenAI (2015-2024). Left OpenAI in 2024 to start Safe Superintelligence Inc.',
    contributions: 'Co-authored AlexNet paper (2012). Pioneered sequence-to-sequence learning for machine translation. Key architect behind GPT models at OpenAI. Led research that produced GPT-3 and GPT-4.',
    philosophy: 'Deeply focused on achieving artificial general intelligence safely. Left OpenAI to focus on AI safety, believing current approaches may not adequately address superintelligence risks.',
    role: 'researcher',
    focusAreas: ['deep learning', 'natural language processing', 'AGI', 'AI safety'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ilya_Sutskever',
  },
];

async function getAuthToken(username: string, password: string): Promise<string> {
  console.log('Authenticating with admin API...');

  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('Authentication successful');
  return data.token;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createPerson(
  figure: HistoricalFigure,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const slug = slugify(figure.canonicalName);

  try {
    // Check if person exists
    const checkResponse = await fetch(`${API_BASE}/api/persons/${slug}`);
    if (checkResponse.ok) {
      console.log(`  [SKIP] ${figure.canonicalName}: Already exists`);
      return { success: true };
    }

    // Create the person via admin endpoint
    const createResponse = await fetch(`${API_BASE}/api/admin/persons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        canonicalName: figure.canonicalName,
        aliases: figure.aliases || [],
        shortBio: figure.shortBio,
        background: figure.background,
        careerHistory: figure.careerHistory,
        contributions: figure.contributions,
        philosophy: figure.philosophy,
        role: figure.role,
        focusAreas: figure.focusAreas || [],
        wikipediaUrl: figure.wikipediaUrl,
        imageUrl: figure.imageUrl,
        status: 'published',
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log(`  [ERROR] ${figure.canonicalName}: ${createResponse.status} - ${error}`);
      return { success: false, error };
    }

    console.log(`  [CREATED] ${figure.canonicalName}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  [ERROR] ${figure.canonicalName}: ${message}`);
    return { success: false, error: message };
  }
}

async function main() {
  console.log('Starting historical figures seed via API...\n');

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('ERROR: ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }

  try {
    const token = await getAuthToken(username, password);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const figure of HISTORICAL_FIGURES) {
      const result = await createPerson(figure, token);
      if (result.success) {
        if (result.error) {
          skipped++;
        } else {
          created++;
        }
      } else {
        errors++;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('\n========================================');
    console.log('Historical Figures Seed Complete');
    console.log('========================================');
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${HISTORICAL_FIGURES.length}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
