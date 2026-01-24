/**
 * Sprint TD-3: Historical Depth Expansion
 * Seeds foundational AI milestones (1943-2012) via the production API
 *
 * Usage: npx tsx scripts/seedHistoricalMilestonesViaApi.ts
 */

const API_BASE = 'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/prod';

interface HistoricalMilestone {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  significance: number;
  organization?: string;
  contributors?: string[];
  sourceUrl?: string;
  tags?: string[];
  tldr?: string;
  simpleExplanation?: string;
  historicalContext?: string;
  whyItMattersToday?: string;
}

const HISTORICAL_MILESTONES: HistoricalMilestone[] = [
  // ===========================================================================
  // FOUNDATIONAL ERA (1943-1955): Mathematical & Computational Foundations
  // ===========================================================================
  {
    id: 'E1943_MCCULLOCH_PITTS',
    title: 'McCulloch-Pitts Neural Model',
    description:
      'Warren McCulloch and Walter Pitts publish "A Logical Calculus of Ideas Immanent in Nervous Activity," creating the first mathematical model of a neural network. This groundbreaking paper showed that networks of simple binary neurons could, in principle, compute any function that a Turing machine could compute.',
    date: '1943-12-01',
    category: 'research',
    significance: 4,
    organization: 'University of Chicago',
    contributors: ['Warren McCulloch', 'Walter Pitts'],
    sourceUrl: 'https://www.cs.cmu.edu/~./epxing/Class/10715/reading/McCulloch.and" +.Pitts.pdf',
    tags: ['neural-networks', 'computational-theory', 'foundations'],
    tldr: 'First mathematical model showing neural networks can compute like machines.',
    simpleExplanation:
      'Imagine trying to understand how the brain thinks by building a simple mechanical version. McCulloch and Pitts created a mathematical recipe for artificial brain cells that could make yes/no decisions, like tiny switches. They proved these simple switches, connected together, could solve any logical problem a computer could solve.',
    historicalContext:
      'This paper emerged during WWII when scientists were exploring computation theory. Building on Alan Turing\'s work on computability, McCulloch (a neurophysiologist) and Pitts (a self-taught mathematical prodigy) bridged neuroscience and mathematics, laying the theoretical foundation for all future neural network research.',
    whyItMattersToday:
      'Every modern neural network, from ChatGPT to image recognition systems, traces its theoretical roots to this 1943 paper. The idea that simple units connected together can produce intelligent behavior remains the core principle of deep learning.',
  },
  {
    id: 'E1950_TURING_TEST',
    title: 'Turing Test Proposed',
    description:
      'Alan Turing publishes "Computing Machinery and Intelligence" in the journal Mind, proposing the imitation game (later known as the Turing Test) as a criterion for machine intelligence. This seminal paper asks "Can machines think?" and introduces concepts that would shape AI philosophy for decades.',
    date: '1950-10-01',
    category: 'research',
    significance: 4,
    organization: 'University of Manchester',
    contributors: ['Alan Turing'],
    sourceUrl: 'https://academic.oup.com/mind/article/LIX/236/433/986238',
    tags: ['turing-test', 'philosophy-of-mind', 'foundations', 'intelligence'],
    tldr: 'Turing asks "Can machines think?" and proposes a test to find out.',
    simpleExplanation:
      'Alan Turing asked a simple but profound question: How would we know if a computer could really think? His answer was practical: if you had a conversation with a computer through text, and couldn\'t tell it wasn\'t human, then perhaps it could think. This "imitation game" became the most famous test for artificial intelligence.',
    historicalContext:
      'Turing wrote this paper five years after helping crack Nazi codes during WWII and two years after proposing one of the first stored-program computers. His work bridged abstract mathematics with practical computing, and this paper moved the conversation from "can we build computers" to "can we build thinking machines."',
    whyItMattersToday:
      'The Turing Test remains the benchmark for conversational AI. When ChatGPT or Claude engage in natural dialogue, they\'re being measured against Turing\'s 1950 vision. Modern LLMs have arguably passed versions of the test, making Turing\'s philosophical questions more relevant than ever.',
  },
  {
    id: 'E1951_FIRST_NEURAL_NETWORK',
    title: 'First Neural Network Machine (SNARC)',
    description:
      'Marvin Minsky and Dean Edmonds build SNARC (Stochastic Neural Analog Reinforcement Calculator), the first neural network computer. Using 3,000 vacuum tubes and surplus automatic pilot mechanisms from B-24 bombers, this machine could learn to navigate a maze through trial and error.',
    date: '1951-06-01',
    category: 'breakthrough',
    significance: 3,
    organization: 'Princeton University',
    contributors: ['Marvin Minsky', 'Dean Edmonds'],
    tags: ['neural-networks', 'hardware', 'reinforcement-learning', 'first'],
    tldr: 'First physical neural network machine learns to solve mazes.',
    simpleExplanation:
      'Marvin Minsky built the first machine that could learn from experience. Using parts from WWII bomber planes and thousands of vacuum tubes, his machine learned to navigate through a maze by trying different paths and remembering what worked. It was like a mechanical rat learning to find cheese.',
    historicalContext:
      'Built as part of Minsky\'s PhD research, SNARC demonstrated that the theoretical neural networks of McCulloch-Pitts could be implemented in hardware. The use of random elements and reinforcement learning presaged techniques that would become central to modern AI.',
    whyItMattersToday:
      'SNARC proved neural networks could work in the real world, not just on paper. Modern reinforcement learning systems like DeepMind\'s game-playing AIs use the same fundamental principle: learn from trial and error.',
  },

  // ===========================================================================
  // BIRTH OF AI (1956-1969): The Field Emerges
  // ===========================================================================
  {
    id: 'E1956_DARTMOUTH',
    title: 'Dartmouth Conference: Birth of AI',
    description:
      'John McCarthy, Marvin Minsky, Claude Shannon, and Nathaniel Rochester organize the Dartmouth Summer Research Project on Artificial Intelligence. This two-month workshop formally establishes AI as a field, coins the term "artificial intelligence," and brings together the founders who would shape the discipline for decades.',
    date: '1956-08-31',
    category: 'industry',
    significance: 4,
    organization: 'Dartmouth College',
    contributors: [
      'John McCarthy',
      'Marvin Minsky',
      'Claude Shannon',
      'Nathaniel Rochester',
    ],
    sourceUrl: 'http://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html',
    tags: ['dartmouth', 'founding', 'history', 'artificial-intelligence'],
    tldr: 'The workshop where AI got its name and became a scientific field.',
    simpleExplanation:
      'In the summer of 1956, a small group of scientists gathered at Dartmouth College with an ambitious goal: to figure out how to make machines that could think. They called their subject "artificial intelligence" - and that name stuck. This meeting is considered the birth of AI as a field of study.',
    historicalContext:
      'The original proposal predicted that "every aspect of learning or any other feature of intelligence can in principle be so precisely described that a machine can be made to simulate it." While overly optimistic about timelines, this vision set the agenda for AI research. Key attendees went on to lead MIT and Stanford AI labs.',
    whyItMattersToday:
      'Dartmouth 1956 is AI\'s founding moment. The research agenda set there - language, reasoning, learning, creativity - remains central to AI today. OpenAI, DeepMind, and Anthropic are still working on problems first articulated at this workshop.',
  },
  {
    id: 'E1957_PERCEPTRON',
    title: 'The Perceptron',
    description:
      'Frank Rosenblatt invents the Perceptron at Cornell Aeronautical Laboratory, the first algorithm that could learn from data. The Mark I Perceptron was implemented in custom hardware and could learn to recognize simple patterns. This sparked enormous excitement and media coverage about thinking machines.',
    date: '1957-07-01',
    category: 'breakthrough',
    significance: 4,
    organization: 'Cornell Aeronautical Laboratory',
    contributors: ['Frank Rosenblatt'],
    sourceUrl: 'https://news.cornell.edu/stories/2019/09/professors-perceptron-paved-way-ai-60-years-too-soon',
    tags: ['perceptron', 'neural-networks', 'machine-learning', 'pattern-recognition'],
    tldr: 'First algorithm that could learn patterns from examples.',
    simpleExplanation:
      'Frank Rosenblatt created the first machine that could learn to recognize patterns by being shown examples. Like teaching a child to recognize cats by showing them pictures, the Perceptron adjusted itself until it could identify simple shapes. The Navy funded it hoping to build machines that could identify ships and planes.',
    historicalContext:
      'The Perceptron generated tremendous excitement. The New York Times ran headlines like "New Navy Device Learns By Doing." Rosenblatt made bold predictions about machines that could walk, talk, and even reproduce. This hype would later contribute to the AI Winter when limitations became apparent.',
    whyItMattersToday:
      'The Perceptron is the direct ancestor of modern neural networks. Every layer in GPT-4 or Claude is essentially a sophisticated perceptron. The core idea - learning by adjusting weights based on errors - remains unchanged.',
  },
  {
    id: 'E1958_LISP',
    title: 'LISP Programming Language',
    description:
      'John McCarthy creates LISP (LISt Processing) at MIT, the second-oldest high-level programming language still in use. Designed specifically for AI research, LISP introduced concepts like recursion, garbage collection, and dynamic typing that influenced all subsequent programming languages.',
    date: '1958-10-01',
    category: 'research',
    significance: 3,
    organization: 'MIT',
    contributors: ['John McCarthy'],
    sourceUrl: 'http://www-formal.stanford.edu/jmc/recursive.html',
    tags: ['lisp', 'programming-languages', 'symbolic-ai', 'foundations'],
    tldr: 'AI gets its own programming language, still used today.',
    simpleExplanation:
      'John McCarthy invented a new computer language specially designed for building thinking machines. LISP was unusual because it could easily work with symbols and ideas, not just numbers. It became the language of AI research for decades and introduced features that most programming languages now use.',
    historicalContext:
      'LISP was revolutionary: it could manipulate its own code, automatically clean up memory, and represent complex nested structures. These capabilities made it ideal for symbolic AI research. The language shaped how researchers thought about AI problems for the next 40 years.',
    whyItMattersToday:
      'While Python dominates modern AI, LISP\'s concepts live on in every functional programming language. Its influence extends to modern AI systems that reason about symbols and logic alongside neural networks.',
  },
  {
    id: 'E1966_ELIZA',
    title: 'ELIZA Chatbot',
    description:
      'Joseph Weizenbaum at MIT creates ELIZA, one of the first chatbots. ELIZA simulated a Rogerian psychotherapist using simple pattern matching, yet users often formed emotional connections with it, treating it as human. Weizenbaum was disturbed by this and became a critic of AI.',
    date: '1966-01-01',
    category: 'product',
    significance: 3,
    organization: 'MIT',
    contributors: ['Joseph Weizenbaum'],
    sourceUrl: 'https://web.stanford.edu/class/linguist238/p36-weizenbaum.pdf',
    tags: ['chatbot', 'natural-language', 'nlp', 'human-computer-interaction'],
    tldr: 'First chatbot to fool users into thinking it was human.',
    simpleExplanation:
      'ELIZA was a simple computer program that acted like a therapist, responding to what you typed with questions like "How does that make you feel?" It used tricks rather than true understanding, but people found themselves confiding in it as if it were a real person. Its creator was so worried by this that he wrote a book warning about the dangers of AI.',
    historicalContext:
      'Weizenbaum intended ELIZA as a parody of therapy, but users\' emotional reactions shocked him. His 1976 book "Computer Power and Human Reason" argued that some tasks should never be delegated to computers. The "ELIZA effect" - attributing human qualities to machines - remains relevant today.',
    whyItMattersToday:
      'ELIZA presaged modern chatbots like ChatGPT. The tendency for users to anthropomorphize AI (the "ELIZA effect") is now studied seriously. Weizenbaum\'s ethical concerns about AI relationships feel prophetic given current debates.',
  },

  // ===========================================================================
  // AI WINTER & EXPERT SYSTEMS (1970-1987): Hype, Bust, and Practical Systems
  // ===========================================================================
  {
    id: 'E1969_PERCEPTRONS_BOOK',
    title: 'Perceptrons Book: Neural Network Critique',
    description:
      'Marvin Minsky and Seymour Papert publish "Perceptrons," mathematically proving that single-layer perceptrons cannot solve XOR and other non-linear problems. This influential book is often blamed for the first AI Winter, as funding for neural network research dried up.',
    date: '1969-01-01',
    category: 'research',
    significance: 3,
    organization: 'MIT',
    contributors: ['Marvin Minsky', 'Seymour Papert'],
    tags: ['perceptrons', 'neural-networks', 'critique', 'ai-winter'],
    tldr: 'Book that showed neural network limitations, triggering funding freeze.',
    simpleExplanation:
      'Minsky and Papert wrote a book proving that the popular neural networks of the time couldn\'t solve certain simple problems. Even though multi-layer networks could solve these problems, the book convinced many that neural networks were a dead end. Research funding disappeared for over a decade.',
    historicalContext:
      'The book was technically accurate about single-layer limitations, but its negative conclusions were applied too broadly to neural networks in general. Multi-layer networks with backpropagation would eventually overcome these limitations, but not until the 1980s.',
    whyItMattersToday:
      'This cautionary tale shows how influential criticism can shape research directions. The AI field learned that promising approaches can be abandoned prematurely. It also shows how hype cycles work: overblown promises followed by harsh corrections.',
  },
  {
    id: 'E1973_LIGHTHILL',
    title: 'Lighthill Report: UK AI Funding Collapse',
    description:
      'Sir James Lighthill delivers a devastating report to the British Science Research Council, criticizing AI research as overhyped and unproductive. The report leads to the end of most AI research funding in the UK, except at Edinburgh, and signals the start of the first "AI Winter."',
    date: '1973-04-01',
    category: 'industry',
    significance: 3,
    organization: 'UK Science Research Council',
    contributors: ['James Lighthill'],
    tags: ['ai-winter', 'funding', 'uk', 'criticism'],
    tldr: 'Government report kills UK AI funding for a decade.',
    simpleExplanation:
      'A famous mathematician told the British government that AI researchers had promised too much and delivered too little. He said robots and translation machines were decades away. His report convinced the government to stop funding AI research, causing a brain drain as researchers fled to the US.',
    historicalContext:
      'The Lighthill Report came after years of unfulfilled promises from AI researchers. Combined with similar skepticism in the US (the ALPAC report had already killed machine translation funding in 1966), it marked the beginning of the first AI Winter.',
    whyItMattersToday:
      'The Lighthill Report is a reminder of AI\'s boom-bust cycles. Today\'s AI hype should be tempered by knowledge of these past winters. The report\'s criticisms about overpromising remain relevant in 2024.',
  },
  {
    id: 'E1974_BACKPROPAGATION',
    title: 'Backpropagation Algorithm',
    description:
      'Paul Werbos describes backpropagation in his Harvard PhD thesis, the algorithm that makes training multi-layer neural networks practical. Though largely ignored at the time, this would become the foundation of modern deep learning when rediscovered by Rumelhart, Hinton, and Williams in 1986.',
    date: '1974-08-01',
    category: 'research',
    significance: 4,
    organization: 'Harvard University',
    contributors: ['Paul Werbos'],
    tags: ['backpropagation', 'neural-networks', 'machine-learning', 'training'],
    tldr: 'The algorithm that makes deep learning possible, discovered 40 years early.',
    simpleExplanation:
      'Paul Werbos figured out how to train neural networks with many layers. The trick was to calculate how each part of the network contributed to errors, then adjust everything accordingly - like tracing a mistake through a chain of helpers to fix it at each step. His discovery was ignored for over a decade.',
    historicalContext:
      'Werbos developed backpropagation during the AI Winter, when neural network research was unfashionable. His thesis was not widely read, and the algorithm was independently rediscovered several times before gaining prominence.',
    whyItMattersToday:
      'Backpropagation is still the core algorithm training every modern neural network, including GPT-4, Claude, and all deep learning systems. Werbos\'s 1974 insight powers a trillion-dollar industry.',
  },
  {
    id: 'E1980_XCON',
    title: 'R1/XCON: Expert Systems Era Begins',
    description:
      'Digital Equipment Corporation deploys R1/XCON, an expert system that configures VAX computers. Saving DEC an estimated $40 million per year, XCON demonstrated that AI could have immediate commercial value and launched the expert systems boom of the 1980s.',
    date: '1980-01-01',
    category: 'product',
    significance: 3,
    organization: 'Digital Equipment Corporation',
    contributors: ['John P. McDermott'],
    tags: ['expert-systems', 'commercial-ai', 'knowledge-engineering'],
    tldr: 'First profitable AI system saves $40 million annually.',
    simpleExplanation:
      'R1/XCON was a computer program that could configure complicated computer systems - a job that used to require expensive human experts. It worked by encoding thousands of rules about how computer parts fit together. When it started saving millions of dollars, suddenly every company wanted an "expert system."',
    historicalContext:
      'XCON launched the commercial expert systems industry. Companies like Teknowledge and IntelliCorp were founded to build similar systems. Lisp machine companies flourished. This was AI\'s first commercial gold rush.',
    whyItMattersToday:
      'Expert systems proved AI could generate real business value. While they were later displaced by statistical approaches, the idea of capturing domain expertise in software persists in modern AI assistants and decision support systems.',
  },
  {
    id: 'E1982_FIFTH_GEN',
    title: 'Japan\'s Fifth Generation Computer Project',
    description:
      'Japan announces the Fifth Generation Computer Project, a $400 million, 10-year initiative to build intelligent computers using logic programming. The announcement triggers panic in the US and Europe, leading to increased AI funding. The project ultimately fails to achieve its ambitious goals.',
    date: '1982-04-14',
    category: 'industry',
    significance: 3,
    organization: 'Japanese Ministry of International Trade and Industry',
    tags: ['fifth-generation', 'japan', 'government-funding', 'prolog', 'ai-race'],
    tldr: 'Japan\'s AI moonshot triggers global AI arms race.',
    simpleExplanation:
      'Japan announced plans to build super-intelligent computers, scaring American and European governments. Suddenly everyone was talking about an "AI gap" like the "missile gap." Countries poured money into AI research to keep up, leading to a boom in AI spending - though Japan\'s project never achieved its ambitious goals.',
    historicalContext:
      'The Fifth Generation Project aimed to create computers that could reason and understand language. It bet heavily on Prolog and logic programming. When the project ended in 1992, it was considered a failure, though it advanced parallel computing and trained a generation of Japanese researchers.',
    whyItMattersToday:
      'The Fifth Generation Project shows how national competition drives AI investment. Today\'s US-China AI competition echoes this dynamic. It also shows the risk of betting on a single technical approach.',
  },
  {
    id: 'E1986_BACKPROP_PAPER',
    title: 'Backpropagation Breakthrough Paper',
    description:
      'David Rumelhart, Geoffrey Hinton, and Ronald Williams publish "Learning representations by back-propagating errors" in Nature, making backpropagation widely known and demonstrating its power for learning internal representations. This paper revives interest in neural networks.',
    date: '1986-10-09',
    category: 'research',
    significance: 4,
    organization: 'UCSD / CMU',
    contributors: ['David Rumelhart', 'Geoffrey Hinton', 'Ronald Williams'],
    sourceUrl: 'https://www.nature.com/articles/323533a0',
    tags: ['backpropagation', 'neural-networks', 'deep-learning', 'representations'],
    tldr: 'Nature paper brings neural networks back from the dead.',
    simpleExplanation:
      'This famous paper explained how to train neural networks with many layers, making it accessible to researchers worldwide. It showed that networks could learn useful internal "representations" of data - discovering meaningful patterns on their own. This sparked renewed excitement about neural networks after the AI Winter.',
    historicalContext:
      'Published in Nature, this paper reached a broad scientific audience. It built on Werbos\'s earlier work and parallel discoveries by others. The PDP (Parallel Distributed Processing) research group\'s two-volume book, published the same year, provided detailed explanations that trained a generation of researchers.',
    whyItMattersToday:
      'This paper is considered the birth of modern deep learning. Hinton, one of the authors, would go on to pioneer many advances and win the 2024 Nobel Prize in Physics for his contributions to AI. The representation learning ideas in this paper directly led to today\'s foundation models.',
  },

  // ===========================================================================
  // SECOND AI WINTER & STATISTICAL ML (1987-2005): Pragmatic Progress
  // ===========================================================================
  {
    id: 'E1987_AI_WINTER_2',
    title: 'Second AI Winter Begins',
    description:
      'The collapse of the Lisp machine market signals the beginning of the second AI Winter. As desktop computers became more powerful and cheaper, specialized AI hardware became obsolete. Expert systems failed to scale, and AI companies went bankrupt or pivoted away from the label.',
    date: '1987-10-01',
    category: 'industry',
    significance: 2,
    tags: ['ai-winter', 'lisp-machines', 'market-crash', 'expert-systems'],
    tldr: 'AI market crashes as specialized hardware becomes obsolete.',
    simpleExplanation:
      'The AI boom of the 1980s went bust. Companies that made special computers for AI went out of business when regular computers got powerful enough. The fancy expert systems turned out to be hard to maintain and couldn\'t adapt to new situations. "AI" became a dirty word in business for years.',
    historicalContext:
      'This winter was driven by market forces rather than technical criticism. Expert systems\' brittleness, the rising power of conventional hardware, and unfulfilled promises combined to create a backlash. Many researchers rebranded their work to avoid the "AI" label.',
    whyItMattersToday:
      'The second AI Winter shows that commercial viability doesn\'t guarantee lasting success. Today\'s AI boom should consider whether current systems are sustainable or could face similar limitations.',
  },
  {
    id: 'E1995_SVM',
    title: 'Support Vector Machines',
    description:
      'Corinna Cortes and Vladimir Vapnik publish "Support-vector networks," introducing SVMs with soft margins. SVMs became the dominant machine learning algorithm of the 1990s and 2000s, showing that statistical learning theory could produce practical, high-performing classifiers.',
    date: '1995-09-01',
    category: 'research',
    significance: 3,
    organization: 'Bell Labs',
    contributors: ['Corinna Cortes', 'Vladimir Vapnik'],
    sourceUrl: 'https://link.springer.com/article/10.1007/BF00994018',
    tags: ['svm', 'machine-learning', 'statistical-learning', 'classification'],
    tldr: 'New algorithm dominates machine learning for two decades.',
    simpleExplanation:
      'SVMs offered a mathematical way to separate data into categories, like drawing the perfect line between different groups of points. They worked reliably and had solid theoretical foundations. For years, if you needed to classify something - spam vs. not spam, tumor vs. healthy - SVMs were the go-to tool.',
    historicalContext:
      'SVMs represented the triumph of statistical machine learning during the AI Winter. Vapnik\'s rigorous theoretical framework appealed to researchers skeptical of neural networks\' "black box" nature. SVMs dominated until deep learning\'s resurgence around 2012.',
    whyItMattersToday:
      'Though largely superseded by deep learning, SVMs showed that principled statistical approaches could solve real problems. Many researchers from the SVM era now work on understanding and improving neural networks with similar rigor.',
  },
  {
    id: 'E1997_DEEP_BLUE',
    title: 'Deep Blue Defeats Kasparov',
    description:
      'IBM\'s Deep Blue becomes the first computer to defeat a reigning world chess champion in a match. Kasparov loses 3.5-2.5 in a six-game match that captures global attention. This moment symbolized the potential of AI to match human expertise in complex tasks.',
    date: '1997-05-11',
    category: 'breakthrough',
    significance: 4,
    organization: 'IBM',
    contributors: ['Feng-hsiung Hsu', 'Murray Campbell', 'Garry Kasparov'],
    sourceUrl: 'https://www.ibm.com/history/deep-blue',
    tags: ['chess', 'game-playing', 'symbolic-ai', 'ibm', 'kasparov'],
    tldr: 'Computer beats world chess champion for the first time.',
    simpleExplanation:
      'Deep Blue was a supercomputer built specifically to play chess. It could evaluate 200 million positions per second. When it beat world champion Garry Kasparov, it made headlines worldwide. Many wondered if this was the beginning of machines outsmarting humans in everything.',
    historicalContext:
      'Chess had long been seen as a benchmark for intelligence. Deep Blue used brute-force search plus hand-crafted evaluation functions, not machine learning. Kasparov accused IBM of cheating and demanded a rematch, which IBM refused. The machine was retired.',
    whyItMattersToday:
      'Deep Blue proved machines could defeat humans at complex intellectual tasks. It set the template for AI milestone moments like AlphaGo beating Lee Sedol in 2016. The debate about whether brute force counts as "real" intelligence continues.',
  },
  {
    id: 'E1998_LENET',
    title: 'LeNet-5: Convolutional Neural Networks',
    description:
      'Yann LeCun and colleagues publish work on LeNet-5, a convolutional neural network for reading handwritten digits. Deployed by banks to read checks, LeNet demonstrated that neural networks could work in production at scale. This architecture would later power the deep learning revolution.',
    date: '1998-11-01',
    category: 'research',
    significance: 3,
    organization: 'Bell Labs / AT&T',
    contributors: ['Yann LeCun', 'Léon Bottou', 'Yoshua Bengio', 'Patrick Haffner'],
    sourceUrl: 'http://yann.lecun.com/exdb/publis/pdf/lecun-01a.pdf',
    tags: ['cnn', 'convolutional', 'computer-vision', 'deep-learning', 'lenet'],
    tldr: 'Neural network architecture that made image recognition practical.',
    simpleExplanation:
      'LeNet was a special kind of neural network designed to "see" images, working similarly to how our brain processes visual information. It could read handwritten numbers on bank checks automatically. The same basic design, scaled up, now powers everything from facial recognition to medical image analysis.',
    historicalContext:
      'LeNet succeeded commercially while neural networks were out of fashion. LeCun proved that with the right architecture and enough data, neural networks could outperform other methods. He would later become Meta\'s Chief AI Scientist.',
    whyItMattersToday:
      'LeNet\'s convolutional architecture is the foundation of modern computer vision. The same principles, scaled massively, power image recognition in smartphones, self-driving cars, and medical diagnostics. LeCun shared the 2018 Turing Award for this work.',
  },
  {
    id: 'E2001_RANDOM_FORESTS',
    title: 'Random Forests Algorithm',
    description:
      'Leo Breiman publishes "Random Forests," introducing an ensemble method that combines multiple decision trees. Random forests became one of the most widely used machine learning algorithms due to their accuracy, robustness, and ability to handle diverse data types.',
    date: '2001-10-01',
    category: 'research',
    significance: 2,
    organization: 'UC Berkeley',
    contributors: ['Leo Breiman'],
    sourceUrl: 'https://link.springer.com/article/10.1023/A:1010933404324',
    tags: ['random-forests', 'ensemble-methods', 'decision-trees', 'machine-learning'],
    tldr: 'Combining many simple models beats one complex model.',
    simpleExplanation:
      'Instead of building one big decision tree, random forests grow many smaller trees and let them vote. Like asking a crowd instead of one expert, this "wisdom of crowds" approach is more reliable and harder to fool. Random forests became the go-to algorithm for practical machine learning problems.',
    historicalContext:
      'Breiman, a statistician, bridged the gap between statistical theory and practical machine learning. Random forests exemplified the shift toward ensemble methods and away from building single perfect models.',
    whyItMattersToday:
      'Random forests remain widely used in industry for structured data problems. The ensemble principle influenced later advances like gradient boosting (XGBoost, LightGBM) that still compete with deep learning on tabular data.',
  },
  {
    id: 'E2006_NETFLIX_PRIZE',
    title: 'Netflix Prize Competition',
    description:
      'Netflix launches a $1 million competition to improve its recommendation algorithm by 10%. The prize attracts thousands of teams worldwide, popularizing collaborative filtering and ensemble methods. It demonstrates that machine learning can significantly improve user experience.',
    date: '2006-10-02',
    category: 'industry',
    significance: 2,
    organization: 'Netflix',
    tags: ['recommender-systems', 'collaborative-filtering', 'competition', 'crowdsourcing'],
    tldr: 'Competition proves AI can dramatically improve recommendations.',
    simpleExplanation:
      'Netflix offered a million dollars to anyone who could make their movie recommendations 10% better. Thousands of data scientists competed for years, trying every technique they could imagine. The competition proved that machine learning could significantly improve products people used every day.',
    historicalContext:
      'The Netflix Prize popularized machine learning competitions and showed the power of combining many techniques (ensembles). It trained a generation of data scientists and demonstrated to industry that ML was worth investing in.',
    whyItMattersToday:
      'The Netflix Prize helped establish the modern ML competition culture (Kaggle, etc.) and proved recommendation systems\' business value. Every streaming service, e-commerce site, and social network now uses descendants of these techniques.',
  },
  {
    id: 'E2006_DEEP_BELIEF_NETS',
    title: 'Deep Belief Networks',
    description:
      'Geoffrey Hinton and colleagues publish "A Fast Learning Algorithm for Deep Belief Nets," showing that deep networks could be trained effectively using layer-wise pre-training. This paper is credited with starting the deep learning revolution by proving deep networks could work.',
    date: '2006-07-01',
    category: 'research',
    significance: 4,
    organization: 'University of Toronto',
    contributors: ['Geoffrey Hinton', 'Simon Osindero', 'Yee-Whye Teh'],
    sourceUrl: 'https://www.cs.toronto.edu/~hinton/absps/fastnc.pdf',
    tags: ['deep-learning', 'deep-belief-nets', 'unsupervised-learning', 'pre-training'],
    tldr: 'Breakthrough proves deep neural networks can be trained effectively.',
    simpleExplanation:
      'For years, deep neural networks (networks with many layers) seemed impossible to train properly. Hinton found a trick: train each layer separately first, then fine-tune the whole network together. This breakthrough proved that deep learning could work, restarting neural network research.',
    historicalContext:
      'This paper is often cited as the start of the deep learning era. It came after a 15-year "neural network winter" within the broader AI field. Hinton\'s persistence during those difficult years eventually paid off spectacularly.',
    whyItMattersToday:
      'While the specific pre-training technique has been superseded, this paper\'s impact was immense. It convinced researchers that deep learning was viable, leading directly to today\'s foundation models. Hinton received the 2024 Nobel Prize partly for this work.',
  },

  // ===========================================================================
  // DEEP LEARNING DAWN (2009-2012): The Revolution Begins
  // ===========================================================================
  {
    id: 'E2009_IMAGENET',
    title: 'ImageNet Dataset Released',
    description:
      'Fei-Fei Li and her team release ImageNet, a dataset of over 14 million labeled images across 20,000 categories. This massive dataset enabled the training of powerful visual recognition systems and became the benchmark that would demonstrate deep learning\'s superiority.',
    date: '2009-06-20',
    category: 'research',
    significance: 4,
    organization: 'Stanford University / Princeton',
    contributors: ['Fei-Fei Li', 'Jia Deng', 'Wei Dong', 'Richard Socher', 'Li-Jia Li', 'Kai Li', 'Li Fei-Fei'],
    sourceUrl: 'https://www.image-net.org/',
    tags: ['imagenet', 'dataset', 'computer-vision', 'benchmark'],
    tldr: 'Massive image database becomes AI\'s proving ground.',
    simpleExplanation:
      'Fei-Fei Li led the creation of ImageNet, a huge collection of millions of labeled pictures. Like a giant vocabulary flashcards for computers, ImageNet let researchers train and test systems that could recognize objects in photos. It became the standard way to measure progress in computer vision.',
    historicalContext:
      'Li was inspired by how children learn to see by viewing billions of images. Using Amazon Mechanical Turk workers, her team labeled millions of images. The annual ImageNet competition (ILSVRC) became the benchmark where deep learning would prove itself.',
    whyItMattersToday:
      'ImageNet was essential to the deep learning revolution. The competition pushed researchers to achieve superhuman performance in image recognition. Today\'s AI image capabilities trace directly to this dataset.',
  },
  {
    id: 'E2012_ALEXNET',
    title: 'AlexNet: Deep Learning Breakthrough',
    description:
      'Alex Krizhevsky, Ilya Sutskever, and Geoffrey Hinton win the ImageNet competition with AlexNet, crushing the competition with an error rate of 15.3% versus 26.2% for the second place. This deep convolutional neural network trained on GPUs proves that deep learning works and sparks the modern AI revolution.',
    date: '2012-09-30',
    category: 'breakthrough',
    significance: 4,
    organization: 'University of Toronto',
    contributors: ['Alex Krizhevsky', 'Ilya Sutskever', 'Geoffrey Hinton'],
    sourceUrl: 'https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html',
    tags: ['alexnet', 'imagenet', 'deep-learning', 'cnn', 'gpu', 'computer-vision'],
    tldr: 'GPU-trained neural network crushes competition, proving deep learning works.',
    simpleExplanation:
      'AlexNet was a neural network that shocked the world by winning an image recognition contest by a huge margin. The secret ingredients were using graphics card (GPU) hardware designed for video games to train a much deeper network than anyone had tried before. Overnight, everyone in AI realized they had been doing things wrong.',
    historicalContext:
      'AlexNet combined several advances: GPUs for training, ReLU activations, dropout regularization, and data augmentation. Its crushing victory proved that neural networks, given enough data and compute, could far exceed traditional methods.',
    whyItMattersToday:
      'AlexNet is considered the "big bang" of modern AI. It triggered the deep learning gold rush, with tech giants racing to hire neural network researchers. Sutskever went on to co-found OpenAI. Every modern AI breakthrough traces back to this 2012 moment.',
  },
  {
    id: 'E2012_GOOGLE_CAT',
    title: 'Google Brain Learns to Recognize Cats',
    description:
      'Google\'s neural network learns to recognize cats in YouTube videos without being told what a cat is. Using 16,000 CPU cores and a billion connections, the system discovered the concept of "cat" through unsupervised learning. This demonstrates that neural networks can learn meaningful concepts from raw data.',
    date: '2012-06-26',
    category: 'research',
    significance: 3,
    organization: 'Google',
    contributors: ['Andrew Ng', 'Jeff Dean', 'Quoc Le'],
    sourceUrl: 'https://static.googleusercontent.com/media/research.google.com/en//archive/unsupervised_icml2012.pdf',
    tags: ['google-brain', 'unsupervised-learning', 'representation-learning', 'scale'],
    tldr: 'AI learns what a cat is without being told, by watching YouTube.',
    simpleExplanation:
      'Google built a huge neural network and fed it random images from YouTube videos. Without any labels or guidance, the network figured out on its own that "cat" was an important concept worth recognizing. This showed that AI could discover meaningful ideas just from seeing enough examples.',
    historicalContext:
      'This was one of the first major demonstrations of large-scale deep learning at a tech company. Andrew Ng and Jeff Dean showed that Google\'s computing resources could advance AI research. The "cat paper" captured public imagination about what AI could do.',
    whyItMattersToday:
      'This paper helped establish unsupervised and self-supervised learning as important research directions. The idea that AI can learn meaningful representations without explicit labels led to today\'s foundation models that learn from massive unlabeled datasets.',
  },
];

async function getAuthToken(username: string, password: string): Promise<string> {
  console.log('Authenticating with admin API...');

  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Authentication failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('Authentication successful');
  return data.token;
}

async function createMilestone(
  milestone: HistoricalMilestone,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if milestone exists
    const checkResponse = await fetch(`${API_BASE}/api/milestones/${milestone.id}`);

    if (checkResponse.ok) {
      console.log(`  [SKIP] ${milestone.id}: Already exists`);
      return { success: true };
    }

    // Create the milestone
    const createResponse = await fetch(`${API_BASE}/api/milestones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        date: milestone.date,
        category: milestone.category,
        significance: milestone.significance,
        organization: milestone.organization,
        contributors: milestone.contributors || [],
        sourceUrl: milestone.sourceUrl || '',
        tags: milestone.tags || [],
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log(`  [ERROR] ${milestone.id}: ${createResponse.status} - ${error}`);
      return { success: false, error };
    }

    console.log(`  [CREATED] ${milestone.id}: ${milestone.title}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  [ERROR] ${milestone.id}: ${message}`);
    return { success: false, error: message };
  }
}

async function main() {
  console.log('Starting historical milestones seed via API...\n');

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

    for (const milestone of HISTORICAL_MILESTONES) {
      const result = await createMilestone(milestone, token);
      if (result.success) {
        if (result.error) {
          skipped++;
        } else {
          created++;
        }
      } else {
        errors++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n========================================');
    console.log('Historical Milestones Seed Complete');
    console.log('========================================');
    console.log(`Created: ${created}`);
    console.log(`Skipped (already exists): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${HISTORICAL_MILESTONES.length}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
