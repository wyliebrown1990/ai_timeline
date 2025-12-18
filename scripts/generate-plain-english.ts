/**
 * Script to generate plainEnglish content for all milestones
 *
 * Usage: npx tsx scripts/generate-plain-english.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTENT_PATH = path.join(__dirname, '../src/content/milestones/layered-content.json');

interface PlainEnglish {
  whatHappened: string;
  thinkOfItLike: string;
  howItAffectsYou: string;
  tryItYourself?: string;
  watchOutFor?: string;
}

interface Milestone {
  tldr: string;
  simpleExplanation: string;
  businessImpact: string;
  technicalDepth?: string;
  historicalContext?: string;
  whyItMattersToday?: string;
  commonMisconceptions?: string;
  plainEnglish?: PlainEnglish;
  executiveBrief?: Record<string, unknown>;
}

type LayeredContent = Record<string, Milestone | string>;

// Plain English content for each milestone without it
const plainEnglishContent: Record<string, PlainEnglish> = {
  "E1943_MCCULLOCH_PITTS": {
    whatHappened: "In 1943, two scientists created the first mathematical description of how brain cells might work. They showed that simple 'yes/no' decisions, when connected together, could compute things—like how many votes it takes to pass a decision.",
    thinkOfItLike: "Think of a group of friends deciding where to eat dinner. If enough people vote 'yes' for pizza, the group goes for pizza. Each person is like a simple brain cell, and the group decision is like a computation.",
    howItAffectsYou: "This 80-year-old idea is the distant ancestor of every AI you use today—from voice assistants to photo filters to ChatGPT. It all started with this simple model of how brain cells might work together.",
    watchOutFor: "This was just a theory about brains, not an actual thinking machine. The real AI we use today came much later, but it built on these foundations."
  },
  "E1948_SHANNON_INFORMATION_THEORY": {
    whatHappened: "Claude Shannon figured out how to measure information mathematically. He asked: 'How surprising is this message?' Very predictable things (like 'the sun will rise tomorrow') have low information. Surprising things have high information.",
    thinkOfItLike: "Imagine texting a friend. 'Hi' is predictable—not much information. 'I won the lottery!' is surprising—lots of information. Shannon created formulas to measure this precisely.",
    howItAffectsYou: "Every digital thing in your life uses Shannon's ideas:\n- How your phone compresses photos to save space\n- How streaming video works without constant buffering\n- How WiFi and Bluetooth send data reliably\n- How your text messages get delivered correctly",
    watchOutFor: "Shannon's 'information' is about surprise and patterns, not meaning. A random string of letters has high 'information' by his measure, even though it means nothing."
  },
  "E1950_TURING_TEST": {
    whatHappened: "Alan Turing asked a clever question: instead of debating whether machines can 'really think,' why not just test if a machine can convince a human it's human through conversation? If you can't tell the difference, does it matter?",
    thinkOfItLike: "Imagine texting with two strangers—one human, one computer. If you can't figure out which is which after a good conversation, the computer 'passes' the test. It's like a disguise contest for intelligence.",
    howItAffectsYou: "ChatGPT and similar AI can now pass casual versions of this test—many people can't tell if they're chatting with AI or a person. This raises important questions:\n- Should AI always identify itself?\n- How do we know if customer service is human?\n- Can we trust what we read online?",
    tryItYourself: "Next time you chat with a customer service bot, try to figure out if it's AI or human. Notice what makes you certain either way.",
    watchOutFor: "Passing the Turing Test doesn't mean AI is conscious or truly understands anything. It just means AI is good at seeming human in conversation—which is different from actually thinking."
  },
  "E1955_DARTMOUTH_PROPOSAL": {
    whatHappened: "In 1955, a group of scientists wrote a proposal for a summer research project. They invented the term 'artificial intelligence' and boldly claimed they could make major progress in just one summer. The field of AI was officially born.",
    thinkOfItLike: "It's like a group of inventors getting together and saying 'let's spend the summer figuring out how to build flying cars.' They were ambitious, optimistic, and created a whole new field of research.",
    howItAffectsYou: "Every AI product you use today—Siri, Alexa, ChatGPT, photo filters—traces back to this moment when AI became an official field of study with its own name and research agenda.",
    watchOutFor: "The founders thought AI would be mostly solved in one summer. Nearly 70 years later, we're still working on it. Big promises about AI timelines should always be taken with skepticism."
  },
  "E1958_PERCEPTRON": {
    whatHappened: "Frank Rosenblatt built a machine that could learn to recognize simple patterns by being shown examples. Instead of programming rules, you'd show it pictures and tell it what they were, and it would learn to recognize them.",
    thinkOfItLike: "Teaching a child to recognize cats by showing them lots of cat pictures, rather than explaining 'cats have whiskers, pointy ears, and fur.' The perceptron learned from examples, not rules.",
    howItAffectsYou: "This 'learning from examples' idea is exactly how modern AI works:\n- Face recognition learned from millions of photos\n- Spam filters learned from labeled emails\n- ChatGPT learned from billions of text examples\n\nIt all started with this simple learning machine.",
    watchOutFor: "The original perceptron was very limited—it couldn't learn complex patterns. It took decades of improvements to get to today's powerful AI."
  },
  "E1966_ELIZA": {
    whatHappened: "ELIZA was a simple computer program that pretended to be a therapist. It would turn your statements into questions: say 'I'm worried about my mother' and it might respond 'Tell me more about your family.' People knew it was a program but still found themselves opening up emotionally.",
    thinkOfItLike: "ELIZA was like a mirror with a twist—it reflected your words back as questions. No real understanding, just clever word-matching. Yet people treated it like a real counselor.",
    howItAffectsYou: "ELIZA taught us something important: humans naturally treat things that seem to understand us as if they do understand. This is why we:\n- Talk to our phones like they're people\n- Feel frustrated when chatbots don't 'get' us\n- Might share personal info with AI without thinking",
    tryItYourself: "Search for 'ELIZA chatbot' online—you can still talk to versions of it. Notice how it makes you feel, even knowing it's just pattern matching.",
    watchOutFor: "Just because something responds appropriately doesn't mean it understands. Modern AI like ChatGPT is much more sophisticated than ELIZA, but the same principle applies."
  },
  "E1969_PERCEPTRONS_BOOK": {
    whatHappened: "Two influential scientists wrote a book proving that the simple learning machines of the time (perceptrons) couldn't solve certain basic problems. This led many researchers to abandon this approach for over a decade.",
    thinkOfItLike: "Imagine someone proving that bicycles can't climb mountains. True, but that doesn't mean you should throw away all wheeled vehicles—you just need better ones (like cars). The book was right about limits but wrong about giving up.",
    howItAffectsYou: "This shows how scientific progress isn't always smooth. Sometimes promising ideas get abandoned too soon, and breakthroughs get delayed by years. The neural network approach that was 'killed' in 1969 is now powering ChatGPT and all modern AI.",
    watchOutFor: "Be cautious about claims that any technology is 'dead' or 'can never work.' History shows that overcoming limitations often just requires new approaches."
  },
  "E1972_PROLOG": {
    whatHappened: "Prolog was a new kind of programming language where you describe what you want, not how to get it. Instead of step-by-step instructions, you write facts and rules, and the computer figures out the answers.",
    thinkOfItLike: "Normal programming is like giving driving directions ('turn left, go straight, turn right'). Prolog is like saying 'I want to get to the library'—the computer figures out the route itself.",
    howItAffectsYou: "Prolog-style thinking shows up in many places:\n- How databases answer questions\n- Expert systems that follow logical rules\n- Some parts of legal and medical software\n- Puzzle and game AI",
    watchOutFor: "This 'logical' approach to AI was popular for decades but struggled with the messy, uncertain real world. Modern AI uses statistics and learning instead, though logic-based systems still have their place."
  },
  "E1980_EXPERT_SYSTEMS_RISE": {
    whatHappened: "Expert systems were programs that captured human expert knowledge as rules. A medical expert system might have hundreds of rules like 'if fever AND cough AND tropical travel, consider malaria.' For the first time, AI delivered real business value.",
    thinkOfItLike: "Imagine interviewing a doctor and writing down every 'if this, then that' rule they use to diagnose patients. Then putting all those rules in a computer. That's an expert system.",
    howItAffectsYou: "Expert systems were the first AI that businesses actually paid for and used:\n- Computer companies used them to configure orders\n- Banks used them for loan decisions\n- Some early medical diagnosis systems\n\nToday's 'decision engines' in banks and insurance descend from these.",
    watchOutFor: "Expert systems only worked in narrow, well-defined areas. They couldn't handle situations outside their rules, and keeping all the rules consistent became a nightmare as systems grew."
  },
  "E1986_BACKPROP": {
    whatHappened: "Backpropagation is the algorithm that lets neural networks learn from their mistakes. When a network gets something wrong, backprop figures out exactly how much each connection contributed to the error and adjusts them all to do better.",
    thinkOfItLike: "When a basketball team loses, a good coach doesn't just say 'play better.' They identify exactly what went wrong—who missed which shots, who was out of position—and make specific adjustments. Backprop does this automatically for AI.",
    howItAffectsYou: "Every time you hear about 'training' an AI model, backprop is doing the work. It's how:\n- ChatGPT learned to write\n- Image recognition learned to see\n- Translation AI learned languages\n- Voice assistants learned to understand speech",
    watchOutFor: "Training AI with backprop requires enormous amounts of data and computing power. This is why AI development is concentrated in big tech companies with massive resources."
  },
  "E1995_SVM": {
    whatHappened: "Support Vector Machines (SVMs) were a clever algorithm for sorting things into categories. If you're separating spam from good email, an SVM finds the best possible dividing line—one that keeps spam on one side with the widest possible safety margin.",
    thinkOfItLike: "Imagine drawing a line on a map to separate two neighborhoods. You don't want to squeeze it against the houses—you want it right down the middle of the empty space between them. SVMs find that optimal middle line.",
    howItAffectsYou: "SVMs powered many AI applications before deep learning took over:\n- Handwriting recognition\n- Face detection in cameras\n- Medical diagnosis tools\n- Text classification\n\nThey're still used when you don't have massive amounts of data.",
    watchOutFor: "While SVMs were cutting-edge in the 2000s, deep learning has surpassed them for most tasks. But they remain useful for smaller problems where you can't collect millions of examples."
  },
  "E1997_LSTM": {
    whatHappened: "LSTM (Long Short-Term Memory) networks gave AI a way to remember. When processing a sentence or a song, regular AI would forget the beginning by the time it reached the end. LSTMs have special 'memory cells' that can hold onto important information.",
    thinkOfItLike: "Reading a mystery novel, you need to remember clues from chapter 1 to understand the ending. LSTMs give AI a notebook to write down important details for later.",
    howItAffectsYou: "LSTMs powered many technologies you've used:\n- Voice assistants understanding your sentences\n- Google Translate before recent upgrades\n- Autocomplete on your phone\n- Music and video recommendations based on your history",
    watchOutFor: "LSTMs have largely been replaced by newer 'Transformer' technology (used in ChatGPT) that can process information faster. But they're still used in some applications."
  },
  "E1997_DEEP_BLUE": {
    whatHappened: "IBM's Deep Blue computer beat the world chess champion Garry Kasparov. It didn't 'think' about chess like a human—it examined millions of moves per second and used chess knowledge programmed by experts to evaluate positions.",
    thinkOfItLike: "Instead of being a chess genius, Deep Blue was like having a thousand chess experts in a room, each analyzing different possible moves, then combining their conclusions instantly. Brute force plus expertise.",
    howItAffectsYou: "Deep Blue showed computers could match humans at complex mental tasks:\n- It was a milestone in public awareness of AI\n- It influenced investment in AI research\n- It showed specialized AI could excel in narrow domains\n\nBut it wasn't the kind of AI we use today—it couldn't learn or do anything except chess.",
    watchOutFor: "Deep Blue was programmed, not learned. Modern AI like AlphaZero learned chess entirely by playing itself—a fundamentally different and more powerful approach."
  },
  "E1998_LENET": {
    whatHappened: "LeNet was a neural network designed to read handwritten numbers on bank checks. Instead of looking at the whole image, it scanned for local patterns—edges, curves, corners—and built up to recognizing complete digits.",
    thinkOfItLike: "When you read handwriting, you don't analyze the whole page at once. You look at small patterns—loops, lines, curves—and piece together letters and numbers. LeNet worked the same way.",
    howItAffectsYou: "LeNet's approach (called 'convolutional neural networks') now powers:\n- Face recognition in your phone\n- Photo organization in your gallery\n- Medical image analysis\n- Self-driving car vision\n- Social media image moderation\n\nEvery AI that 'sees' uses LeNet's descendants.",
    watchOutFor: "While LeNet proved the concept, it took another 14 years and much faster computers before this approach became mainstream. Good ideas sometimes need time and technology to catch up."
  },
  "E2006_DEEP_BELIEF_NETS": {
    whatHappened: "Training deep neural networks (many layers) was nearly impossible—they got stuck and wouldn't learn. Geoffrey Hinton found a workaround: train one layer at a time, then connect them. This made deep learning possible.",
    thinkOfItLike: "You can't build a skyscraper by constructing all floors at once. You build the foundation, then each floor on top. Deep Belief Networks trained neural networks the same way—layer by layer.",
    howItAffectsYou: "This breakthrough reignited interest in neural networks and led directly to:\n- The deep learning revolution\n- Modern AI assistants\n- Image and speech recognition\n- Everything powered by 'deep learning' today",
    watchOutFor: "The specific technique (Deep Belief Networks) is rarely used now—better methods came along. But it proved deep networks were possible, inspiring the breakthroughs that followed."
  },
  "E2009_IMAGENET": {
    whatHappened: "ImageNet created a massive collection of 14 million labeled images in over 20,000 categories. For the first time, AI researchers had enough visual data to train systems that could recognize almost anything.",
    thinkOfItLike: "To teach a child to recognize 1,000 different objects, you need to show them lots of examples. ImageNet gave AI researchers the photo albums needed to teach computers to see.",
    howItAffectsYou: "ImageNet enabled the computer vision in:\n- Photo organization and search\n- Face recognition\n- Medical image diagnosis\n- Social media content moderation\n- Self-driving cars\n\nIf an AI can recognize what's in an image, ImageNet probably helped train it.",
    watchOutFor: "ImageNet images were collected from the internet and contain biases—certain types of people, objects, and scenes are overrepresented. AI trained on biased data can make biased decisions."
  },
  "E2012_ALEXNET": {
    whatHappened: "In 2012, a deep neural network called AlexNet crushed the competition in an image recognition contest—not by a little, but by a huge margin. It was like breaking the 4-minute mile by 30 seconds. The AI world changed overnight.",
    thinkOfItLike: "Imagine a new basketball player shows up and doesn't just win—they score twice as many points as the previous record. Everyone stops what they're doing to figure out how they did it.",
    howItAffectsYou: "AlexNet triggered the current AI boom:\n- Tech companies started investing billions in AI\n- NVIDIA's GPUs became essential AI hardware\n- Face recognition, photo search, and image apps exploded\n- The technology behind today's AI assistants started here",
    watchOutFor: "AlexNet was designed for image recognition, not understanding. Modern AI has gone far beyond it, but AlexNet showed the world that deep learning actually works."
  },
  "E2013_WORD2VEC": {
    whatHappened: "Word2vec figured out how to represent words as numbers in a way that captures meaning. Similar words get similar numbers. Amazingly, you can do math with meanings: 'King' minus 'Man' plus 'Woman' equals 'Queen.'",
    thinkOfItLike: "Imagine putting every word on a giant map where similar words are close together. 'Dog' and 'puppy' are neighbors; 'dog' and 'algebra' are far apart. Word2vec creates this map automatically from text.",
    howItAffectsYou: "Word2vec enabled AI to work with language meaningfully:\n- Better search engines that understand synonyms\n- Recommendation systems that 'get' what you like\n- Translation and writing tools\n- Every modern language AI builds on these ideas",
    watchOutFor: "Word2vec learned patterns from text, including human biases. If society associates certain jobs with certain genders, so will word2vec. This bias can affect AI applications."
  },
  "E2014_SEQ2SEQ": {
    whatHappened: "Sequence-to-sequence models learned to take one sequence (like an English sentence) and produce another (like its French translation). Read the whole input, compress it to a summary, then generate the output word by word.",
    thinkOfItLike: "A human translator reads a sentence, understands its meaning, then writes it in another language. Seq2seq works similarly—read, understand (in its way), then write.",
    howItAffectsYou: "This architecture transformed machine translation:\n- Google Translate got dramatically better\n- Summarization tools became possible\n- Chatbots could generate coherent responses\n- The blueprint for modern AI language models",
    watchOutFor: "Early seq2seq models struggled with long texts—they'd lose information from the beginning. Later innovations (attention, Transformers) solved this problem."
  },
  "E2014_ATTENTION_NMT": {
    whatHappened: "Attention lets AI models 'look back' at different parts of their input when generating output. During translation, the model can focus on the relevant source words for each output word, rather than trying to remember everything at once.",
    thinkOfItLike: "When translating, you don't memorize the whole sentence first. You look back and forth between the original and your translation, focusing on relevant parts. Attention lets AI do the same.",
    howItAffectsYou: "Attention is the key technology behind modern AI:\n- ChatGPT uses 'self-attention' in every response\n- Translation apps got much better\n- AI can now handle longer, more complex texts\n- It's why modern AI seems to 'understand' context",
    watchOutFor: "Attention makes AI much better at seeming to understand context, but it's still pattern matching, not true understanding. Don't confuse good performance with real comprehension."
  },
  "E2014_ADAM": {
    whatHappened: "Adam is an algorithm that automatically adjusts how AI learns. Instead of using the same learning rate everywhere, Adam figures out what works best for each parameter—speeding up training and making it more reliable.",
    thinkOfItLike: "Manual transmission vs. automatic. With manual, you constantly shift gears. With automatic (Adam), the car figures out the best gear for each moment. Adam does this for AI training.",
    howItAffectsYou: "Adam trains almost every AI model you use:\n- ChatGPT and other language models\n- Image recognition systems\n- Voice assistants\n- Recommendation algorithms\n\nIt's the invisible workhorse that makes AI training practical.",
    watchOutFor: "Adam made AI training much easier, but training large models still requires enormous computing power and energy. The environmental cost of AI is a growing concern."
  },
  "E2014_GANS": {
    whatHappened: "GANs (Generative Adversarial Networks) pit two AI systems against each other: one creates fake images, the other tries to spot the fakes. They push each other to improve until the fakes are indistinguishable from reality.",
    thinkOfItLike: "A counterfeiter and a detective constantly trying to outsmart each other. The counterfeiter's fakes get better and better until even experts can't tell them apart.",
    howItAffectsYou: "GANs enabled AI-generated images:\n- Face filters that change your age or appearance\n- Apps that turn photos into artwork\n- Deepfakes (both creative and concerning)\n- Video game graphics and movie effects",
    tryItYourself: "Try face filter apps that make you look older or younger—these often use GAN technology.",
    watchOutFor: "GANs also enable deepfakes—fake videos of real people. Be cautious about trusting video evidence. If a video seems shocking or out-of-character, it might be AI-generated."
  },
  "E2014_DROPOUT": {
    whatHappened: "Dropout randomly turns off parts of a neural network during training. Surprisingly, this makes the network better at handling new data it hasn't seen before.",
    thinkOfItLike: "A soccer team that practices with random players sitting out each session. Everyone has to learn to adapt and fill different roles, making the whole team more flexible.",
    howItAffectsYou: "Dropout helps AI work better in the real world:\n- AI that handles unusual inputs better\n- More reliable face recognition\n- Voice assistants that understand different accents\n- Generally more robust AI systems",
    watchOutFor: "Even with dropout, AI can still fail on unusual inputs. Don't assume AI will handle edge cases as well as common cases."
  },
  "E2015_BATCHNORM": {
    whatHappened: "Batch normalization is a technique that standardizes the data flowing through a neural network during training. This made training much faster and more stable, enabling the creation of much deeper networks.",
    thinkOfItLike: "In a relay race, if runners pass batons at wildly different speeds, the race gets chaotic. Batch norm makes sure each 'handoff' in the neural network is consistent and predictable.",
    howItAffectsYou: "Batch norm enabled the very deep networks that power:\n- Advanced image recognition\n- Modern language models\n- Video analysis\n- Real-time AI applications",
    watchOutFor: "This is a behind-the-scenes technical improvement you'd never notice directly, but it helped make modern AI possible."
  },
  "E2015_RESNET": {
    whatHappened: "ResNet introduced 'skip connections' that let information jump over layers in a neural network. This solved problems with training very deep networks and allowed networks with 150+ layers—far deeper than before.",
    thinkOfItLike: "Imagine a long game of telephone where messages get garbled. Skip connections are like letting some players pass notes directly to later players, preserving the original message.",
    howItAffectsYou: "ResNet's innovations power the image AI you use daily:\n- Photo organization and search\n- Face recognition in phones and apps\n- Medical image analysis\n- Self-driving car vision systems",
    watchOutFor: "Deeper networks need more computing power. The race for more powerful AI drives massive energy consumption in data centers."
  },
  "E2016_ALPHAGO": {
    whatHappened: "Google's AlphaGo beat the world champion at Go, an ancient game considered far too complex for computers. Unlike chess computers that search through moves, AlphaGo used deep learning to develop intuition for good positions.",
    thinkOfItLike: "Go has more possible positions than atoms in the universe—you can't search through them all. AlphaGo developed 'instincts' through millions of practice games, more like a human master than a calculator.",
    howItAffectsYou: "AlphaGo showed AI could master tasks requiring intuition, not just calculation:\n- AI strategy and decision-making improved\n- Led to better AI for other complex problems\n- Demonstrated AI could surprise human experts",
    watchOutFor: "AlphaGo is narrow AI—brilliant at Go, but it can't play checkers or do anything else. Don't confuse impressive narrow AI with general intelligence."
  },
  "E2017_PPO": {
    whatHappened: "PPO (Proximal Policy Optimization) is a technique for training AI through trial and error—learning from success and failure rather than labeled examples. It makes this type of learning more stable and practical.",
    thinkOfItLike: "Learning to ride a bike by trying, falling, adjusting, trying again. PPO helps AI learn from experience in a way that steadily improves without wild swings in performance.",
    howItAffectsYou: "PPO helped enable:\n- ChatGPT's ability to follow instructions (RLHF training)\n- AI that plays video games\n- Robotics control systems\n- Any AI that learns from feedback rather than examples",
    watchOutFor: "Training AI with feedback from humans (using PPO) can embed human biases into the AI. The AI learns to please its trainers, for better or worse."
  },
  "E2017_TRANSFORMER": {
    whatHappened: "The Transformer architecture replaced previous approaches with 'attention'—letting every word in a sentence look at every other word directly. This parallel processing was faster and captured context better than anything before.",
    thinkOfItLike: "In a meeting, instead of passing notes in a chain (slow, information gets lost), everyone can see everyone else's notes simultaneously. The Transformer lets all parts of the input interact directly.",
    howItAffectsYou: "Transformers power almost all modern AI:\n- ChatGPT, Claude, Gemini (language)\n- Image generation (DALL-E, Midjourney)\n- Video understanding\n- Code generation (GitHub Copilot)\n\nIf an AI seems intelligent, it's probably using Transformers.",
    watchOutFor: "Transformers are computationally expensive—they're why AI companies need massive data centers. The environmental impact of training and running these models is significant."
  },
  "E2018_GPT1": {
    whatHappened: "GPT-1 showed that pre-training a language model on lots of text, then fine-tuning it for specific tasks, worked surprisingly well. One model could learn to do many different language tasks.",
    thinkOfItLike: "Instead of training a separate dog for each trick, you raise a well-rounded dog that can quickly learn any trick. GPT-1 was trained on general language, then adapted to specific tasks.",
    howItAffectsYou: "GPT-1 started the path to:\n- ChatGPT (GPT-1 → GPT-2 → GPT-3 → ChatGPT)\n- AI assistants that help with writing\n- Chatbots that understand context\n- The current AI boom",
    watchOutFor: "GPT-1 was modest by today's standards but showed the recipe that would lead to ChatGPT. The rapid progress from GPT-1 to GPT-4 happened in just five years."
  },
  "E2018_BERT": {
    whatHappened: "BERT (Bidirectional Encoder Representations from Transformers) learned to understand language by reading text in both directions and predicting missing words. It dramatically improved how AI understands the meaning of searches and questions.",
    thinkOfItLike: "To understand 'I went to the bank to deposit my check,' you need context from both sides of 'bank' to know it's about money, not a river. BERT reads context from both directions.",
    howItAffectsYou: "BERT powers search and understanding:\n- Google Search understands your questions better\n- AI can grasp subtle meaning differences\n- Customer service chatbots improved\n- Better text analysis tools",
    tryItYourself: "Google Search got a major upgrade when BERT launched. Try searching for nuanced questions—the quality of results improved significantly.",
    watchOutFor: "BERT understands text statistically, not truly. It's good at patterns but can miss meaning that requires real-world knowledge or common sense."
  },
  "E2018_OPENAI_CHARTER": {
    whatHappened: "OpenAI published a charter committing to developing AI that benefits humanity. They promised to avoid uses that harm people, share safety research, and cooperate with others if another organization gets close to creating very powerful AI.",
    thinkOfItLike: "Like doctors taking the Hippocratic Oath ('first, do no harm'), OpenAI was trying to establish ethical principles for AI development before AI became too powerful.",
    howItAffectsYou: "This charter affects how powerful AI is developed:\n- OpenAI uses it to justify safety measures\n- It sparked conversations about AI ethics\n- It's referenced in debates about AI regulation\n- It shows AI companies are thinking about risks",
    watchOutFor: "Charters are only as good as their enforcement. OpenAI has faced criticism that some decisions seem to conflict with their stated principles. Watch what companies do, not just what they promise."
  },
  "E2019_T5": {
    whatHappened: "T5 (Text-to-Text Transfer Transformer) reframed every language task as 'convert this text to that text.' Translation, summarization, question-answering—all became the same kind of problem, simplifying AI development.",
    thinkOfItLike: "Instead of having different tools for cutting, slicing, and dicing, T5 is like a food processor that handles everything. Put text in, get different text out, regardless of the specific task.",
    howItAffectsYou: "T5's approach influenced:\n- More versatile AI assistants\n- Simplified AI development\n- Better summarization tools\n- Multi-purpose language AI",
    watchOutFor: "The 'text-to-text' approach is powerful but treats all tasks the same way, which isn't always ideal. Some problems benefit from specialized approaches."
  },
  "E2019_ROBERTA": {
    whatHappened: "RoBERTa (Robustly optimized BERT) showed that BERT's training wasn't optimal—with better training (more data, longer training, no shortcuts), the same architecture got much better results.",
    thinkOfItLike: "Discovering that an athlete was training at only 70% intensity. Train harder and longer with better nutrition, and the same athlete gets much better results. RoBERTa did this for BERT.",
    howItAffectsYou: "RoBERTa improved applications that use BERT:\n- More accurate search\n- Better text classification\n- Improved sentiment analysis\n- More reliable AI language understanding",
    watchOutFor: "Better training requires more computing power. As AI training gets more intensive, only large companies can afford to train cutting-edge models."
  },
  "E2019_OECD_AI_PRINCIPLES": {
    whatHappened: "The OECD (36 democratic countries) agreed on principles for trustworthy AI: beneficial to people and planet, transparent, accountable, secure, and respecting human values. It was the first major international AI governance framework.",
    thinkOfItLike: "Like the Geneva Convention sets rules for warfare, the OECD principles try to establish international norms for AI development—what's acceptable and what crosses the line.",
    howItAffectsYou: "These principles influence:\n- Government AI policies and regulations\n- How companies talk about responsible AI\n- International discussions about AI governance\n- Standards for trustworthy AI",
    watchOutFor: "Principles are voluntary and non-binding. Countries and companies can endorse them while still doing questionable things. Watch for enforcement, not just endorsement."
  },
  "E2020_SCALING_LAWS": {
    whatHappened: "Researchers discovered mathematical rules about how AI improves: make the model bigger, train it on more data, use more computing power, and performance improves predictably. These 'scaling laws' helped plan the development of GPT-3 and beyond.",
    thinkOfItLike: "Discovering that you can predict how fast a car will go based on its engine size and fuel quality. Scaling laws let researchers predict AI performance before building the model.",
    howItAffectsYou: "Scaling laws explain why AI keeps getting better:\n- Companies invest in bigger models\n- More computing power → better AI\n- Predictions about future AI capabilities\n- The race to build larger systems",
    watchOutFor: "Bigger isn't always better—huge models are expensive to run and have environmental costs. Researchers are now working on making smaller models more efficient."
  },
  "E2020_RAG": {
    whatHappened: "RAG (Retrieval-Augmented Generation) lets AI look up information before answering. Instead of relying only on what it learned during training, AI can search a database for relevant facts and include them in its response.",
    thinkOfItLike: "Instead of answering from memory (which might be outdated or wrong), you look up the facts first. RAG gives AI a library card so it can check its answers.",
    howItAffectsYou: "RAG makes AI more accurate and current:\n- Company chatbots that access your account info\n- AI assistants with up-to-date knowledge\n- Fewer made-up 'facts' (hallucinations)\n- AI that can work with your documents",
    watchOutFor: "RAG helps but doesn't eliminate AI mistakes. The AI can misinterpret what it retrieves or combine information incorrectly. Always verify important facts."
  },
  "E2021_SWITCH_TRANSFORMERS": {
    whatHappened: "Switch Transformers made huge AI models more efficient by only using relevant parts for each input. Instead of running everything through the entire model, inputs are routed to specialized sub-networks.",
    thinkOfItLike: "A hospital doesn't make every patient see every specialist. You're routed to the relevant expert. Switch Transformers route AI requests to the relevant 'expert' within the model.",
    howItAffectsYou: "This efficiency enables:\n- Larger AI models that are practical to run\n- Faster AI responses\n- Lower costs for AI services\n- More capable AI assistants",
    watchOutFor: "Even with efficiency improvements, large AI models still require significant computing resources. The efficiency gains often enable even bigger models rather than reducing costs."
  },
  "E2021_CLIP": {
    whatHappened: "CLIP learned to connect images and text by training on millions of image-caption pairs from the internet. It can understand both images and words, enabling AI to search images with text descriptions and vice versa.",
    thinkOfItLike: "Teaching someone who speaks two languages to translate between them. CLIP learned to 'translate' between visual and verbal understanding.",
    howItAffectsYou: "CLIP enables:\n- Searching your photos by description ('beach sunset')\n- AI that understands memes and image context\n- Foundation for DALL-E and other image generators\n- Better image moderation on social media",
    tryItYourself: "Try searching your phone photos with descriptions. If it works well, CLIP-style technology is probably involved.",
    watchOutFor: "CLIP learned from internet images, which contain biases. It may have skewed associations about people, places, and objects."
  },
  "E2021_CODEX": {
    whatHappened: "Codex was GPT-3 specialized for code. It could translate English instructions into working computer programs, understanding both human language and programming languages.",
    thinkOfItLike: "A bilingual assistant who can understand what you want in plain English and write it out in computer-speak. 'Make a website that shows cat pictures' → actual code.",
    howItAffectsYou: "Codex and its descendants help you:\n- GitHub Copilot suggests code while you type\n- ChatGPT can help with programming problems\n- Non-programmers can create simple programs\n- Programmers are more productive",
    tryItYourself: "Ask ChatGPT to write code for something simple, like a to-do list app or a calculator. You'll see Codex-style capabilities in action.",
    watchOutFor: "AI-generated code can have bugs or security issues. Never use AI code in important applications without careful review by a human expert."
  },
  "E2021_ALPHAFOLD2": {
    whatHappened: "AlphaFold2 solved a 50-year-old biology problem: predicting how proteins fold into 3D shapes from their chemical sequence. It's like predicting what origami shape you'll get from a sequence of folds.",
    thinkOfItLike: "Knowing a recipe tells you the ingredients, but not what the finished dish looks like. AlphaFold2 can predict the 3D shape of proteins from their 'recipe' (amino acid sequence).",
    howItAffectsYou: "AlphaFold2 accelerates medical research:\n- Faster drug discovery and development\n- Better understanding of diseases\n- New treatments being developed faster\n- A preview of AI solving hard scientific problems",
    watchOutFor: "AlphaFold2 predicts structures, but understanding how proteins work and developing drugs still takes years. It's an accelerant, not a solution."
  },
  "E2022_PALM": {
    whatHappened: "PaLM (Pathways Language Model) was Google's massive 540-billion-parameter language model, showing advanced reasoning and multi-step thinking capabilities. It demonstrated emergent abilities that smaller models didn't have.",
    thinkOfItLike: "A student who suddenly 'gets' algebra after practicing enough problems. PaLM showed that AI can develop new capabilities at larger scales—abilities that smaller versions simply didn't have.",
    howItAffectsYou: "PaLM influenced:\n- Google's Gemini AI assistant\n- Better AI reasoning and problem-solving\n- Medical and scientific AI applications\n- The race for more capable AI",
    watchOutFor: "Emergent capabilities are exciting but unpredictable. We can't always anticipate what abilities very large models will develop—good or problematic."
  },
  "E2022_CHINCHILLA": {
    whatHappened: "Chinchilla proved that AI companies were training models wrong: instead of making models as big as possible, you should balance model size with training data. A smaller model with more data beats a bigger model with less data.",
    thinkOfItLike: "You could become a better cook by buying a bigger kitchen (more model), but you'd improve more by actually cooking more meals (more data). Chinchilla showed the right balance.",
    howItAffectsYou: "Chinchilla changed how AI is developed:\n- More efficient AI models\n- Focus shifted to data quality and quantity\n- Better AI at lower costs\n- Smaller models that perform well",
    watchOutFor: "The emphasis on data means companies are scraping the internet for training material, raising copyright and privacy concerns."
  },
  "E2022_INSTRUCTGPT": {
    whatHappened: "InstructGPT trained AI to follow human instructions by having people rank responses and using that feedback. This made AI much better at doing what users actually wanted.",
    thinkOfItLike: "A chef learning not just to cook, but to take orders. InstructGPT taught AI to understand and follow directions, not just produce plausible text.",
    howItAffectsYou: "InstructGPT is why ChatGPT works so well:\n- AI that follows your requests\n- Helpful responses instead of random text\n- Safer, more aligned AI behavior\n- The 'chat' in ChatGPT",
    watchOutFor: "AI learns to give answers humans rank highly, which isn't always the same as correct answers. AI may be confidently wrong about things the human raters didn't catch."
  },
  "E2022_FLAN": {
    whatHappened: "FLAN (Finetuned Language Net) showed that training AI on many different tasks with instructions makes it better at following new instructions it's never seen. It's like cross-training for AI.",
    thinkOfItLike: "An athlete who trains in multiple sports performs better overall. FLAN showed AI gets better at new tasks when trained on many diverse tasks.",
    howItAffectsYou: "FLAN improved:\n- AI's ability to follow novel instructions\n- More versatile AI assistants\n- Better performance on new tasks\n- More capable out-of-the-box AI",
    watchOutFor: "Better instruction-following doesn't mean the AI understands your intent. It's still matching patterns, just more flexibly."
  },
  "E2022_BLOOM": {
    whatHappened: "BLOOM was a large language model developed openly by a global collaboration of researchers, not a single company. It was designed to be transparent and accessible, with training data and methods publicly documented.",
    thinkOfItLike: "Instead of one company building a secret recipe, BLOOM was like an open-source cookbook that anyone could read, use, and improve.",
    howItAffectsYou: "BLOOM represents an alternative AI development path:\n- Open AI research anyone can build on\n- More scrutiny of how AI works\n- Reduced concentration of AI power\n- Options beyond Big Tech AI",
    watchOutFor: "Open models can be misused more easily since anyone can access them. There's a tradeoff between transparency and potential for harm."
  },
  "E2022_LATENT_DIFFUSION": {
    whatHappened: "Latent diffusion made image generation much more efficient by working in a compressed space rather than pixel by pixel. This enabled high-quality image generation on regular computers, not just massive server farms.",
    thinkOfItLike: "Instead of sculpting a statue from a huge block of marble (expensive, slow), you work with a small clay model and then scale it up. Latent diffusion compresses the creative work.",
    howItAffectsYou: "Latent diffusion powers:\n- Stable Diffusion (free image generation)\n- Consumer image editing tools\n- Video generation technology\n- Art and design AI tools",
    tryItYourself: "Try free Stable Diffusion tools online to generate images from text descriptions. The technology that makes this possible on regular computers is latent diffusion.",
    watchOutFor: "Easy image generation means easier creation of fake photos. Be skeptical of surprising or inflammatory images online."
  },
  "E2022_STABLE_DIFFUSION_RELEASE": {
    whatHappened: "Stability AI released Stable Diffusion as free, open-source software that could run on personal computers. For the first time, anyone could generate high-quality AI images without paying for cloud services.",
    thinkOfItLike: "Like when calculators went from room-sized computers to pocket devices. Stable Diffusion brought AI image generation from expensive cloud services to your laptop.",
    howItAffectsYou: "Stable Diffusion democratized AI art:\n- Free image generation for anyone\n- Artists and designers using AI tools\n- Educational and creative projects\n- Custom applications built on the technology",
    tryItYourself: "Search for 'Stable Diffusion online free' to try generating images from text descriptions. Many websites offer free access.",
    watchOutFor: "Free access means widespread use, including for problematic content. The technology can generate realistic fake photos, raising concerns about misinformation."
  },
  "E2022_CONSTITUTIONAL_AI": {
    whatHappened: "Constitutional AI lets AI critique and revise its own outputs based on a set of principles (its 'constitution'). Instead of humans rating every response, the AI is trained to follow guidelines autonomously.",
    thinkOfItLike: "A student who has internalized the rules and can self-correct their work, rather than needing a teacher to review everything.",
    howItAffectsYou: "Constitutional AI helps make AI safer:\n- AI that refuses harmful requests\n- More consistent behavior\n- Reduced need for human oversight of every interaction\n- Foundation for AI assistants like Claude",
    watchOutFor: "The AI's 'constitution' is written by its creators, embedding their values and blind spots. Constitutional AI reflects the principles of whoever wrote the constitution."
  },
  "E2023_DPO": {
    whatHappened: "DPO (Direct Preference Optimization) simplified how AI learns from human preferences. Instead of complex training procedures, it directly optimizes the AI to produce responses humans prefer over alternatives.",
    thinkOfItLike: "Instead of a complex grading system, just asking 'which answer do you like better?' repeatedly and teaching the AI to give more of those answers.",
    howItAffectsYou: "DPO makes AI development more efficient:\n- Faster creation of helpful AI\n- Lower cost to train AI assistants\n- More companies can build aligned AI\n- Potentially better AI behavior",
    watchOutFor: "Optimizing for human preferences means the AI might tell you what you want to hear rather than what's true. Popularity isn't correctness."
  },
  "E2023_LLAMA": {
    whatHappened: "Meta released LLaMA (Large Language Model Meta AI) to researchers, then LLaMA 2 to everyone. This open model came close to proprietary systems like GPT, letting anyone build on powerful AI technology.",
    thinkOfItLike: "Like a car company releasing their engine designs for free. Now anyone can build their own vehicles using proven technology, not just the big manufacturers.",
    howItAffectsYou: "LLaMA opened AI development:\n- Startups can build powerful AI products\n- Researchers can study how large models work\n- Privacy-focused applications can run AI locally\n- Competition with big AI companies",
    tryItYourself: "Many apps and services are built on LLaMA now. When you use a smaller AI company's chatbot, it might be powered by LLaMA.",
    watchOutFor: "Open models can be fine-tuned for harmful purposes. The benefits of openness come with risks of misuse."
  },
  "E2023_NIST_AIRMF": {
    whatHappened: "NIST (National Institute of Standards and Technology) published a framework for managing AI risks. It provides a structured approach for organizations to identify, assess, and address AI risks throughout the AI lifecycle.",
    thinkOfItLike: "Like building codes for houses, the NIST framework provides standards for building AI safely. Organizations can follow it to reduce the risk of AI problems.",
    howItAffectsYou: "The NIST framework influences:\n- How companies develop and deploy AI\n- Government AI procurement requirements\n- Industry standards for AI safety\n- Corporate AI governance practices",
    watchOutFor: "Frameworks are voluntary unless required by regulation. Companies may claim to follow standards while cherry-picking the easy parts."
  },
  "E2023_US_EO_14110": {
    whatHappened: "President Biden issued an executive order requiring AI developers to share safety test results with the government, establishing standards for AI safety, and directing agencies to address AI risks across many domains.",
    thinkOfItLike: "Like requiring crash testing for cars and environmental impact assessments for construction. The government is creating oversight requirements for powerful AI systems.",
    howItAffectsYou: "This executive order affects:\n- How AI companies develop and test their products\n- Government use of AI in services you interact with\n- AI in hiring, housing, and healthcare decisions\n- Privacy and civil rights protections around AI",
    watchOutFor: "Executive orders can be changed by the next president. Lasting AI regulation requires legislation from Congress."
  },
  "E2025_US_EO_14110_REVOKED": {
    whatHappened: "The Biden executive order on AI was revoked, removing federal AI safety requirements that had been established. This changed the regulatory landscape for AI development in the United States.",
    thinkOfItLike: "Like removing building codes after they were established. Companies that were preparing to comply now face a different regulatory environment.",
    howItAffectsYou: "This affects AI governance:\n- Changed requirements for AI companies\n- Shifted responsibility for AI safety\n- Altered international AI policy dynamics\n- Ongoing debates about AI regulation",
    watchOutFor: "With fewer federal requirements, state laws and industry self-regulation become more important. The regulatory landscape continues to evolve."
  },
  "E2024_EU_AI_ACT": {
    whatHappened: "The European Union passed the AI Act, the world's first comprehensive AI law. It categorizes AI systems by risk level and sets strict requirements for high-risk applications like hiring, healthcare, and law enforcement.",
    thinkOfItLike: "Like food safety laws that vary based on risk—regulations for restaurants are different from regulations for packaged snacks. The EU AI Act applies different rules based on how risky the AI application is.",
    howItAffectsYou: "The EU AI Act affects you if you:\n- Use products from companies that operate in Europe\n- Interact with AI in high-risk categories\n- Want transparency about how AI makes decisions\n- Are subject to AI decisions in hiring or finance",
    watchOutFor: "The EU AI Act applies to companies serving EU customers, regardless of where the company is based. It will shape global AI development, similar to how GDPR affected privacy worldwide."
  },
  "E2025_DEEPSEEK_R1": {
    whatHappened: "DeepSeek-R1 demonstrated advanced reasoning capabilities, showing step-by-step thinking processes that users could follow. It represented progress in making AI reasoning more transparent and capable.",
    thinkOfItLike: "Like a math student who shows their work, not just the answer. DeepSeek-R1 reveals its reasoning steps so you can follow along.",
    howItAffectsYou: "Better AI reasoning helps:\n- Math and science assistance\n- Complex problem solving\n- Understanding how AI reaches conclusions\n- More trustworthy AI outputs",
    watchOutFor: "Showing reasoning steps doesn't guarantee correct answers. AI can have flawed reasoning that sounds convincing. Always verify important conclusions."
  },
  "E2025_OPENAI_OPERATOR": {
    whatHappened: "OpenAI released Operator, an AI that can browse the web and take actions on your behalf—filling out forms, making purchases, and interacting with websites autonomously.",
    thinkOfItLike: "A virtual assistant who can actually use your computer, not just give you instructions. It can book appointments, shop online, and handle web-based tasks.",
    howItAffectsYou: "AI agents like Operator can:\n- Handle tedious online tasks for you\n- Book appointments and reservations\n- Fill out forms and applications\n- Shop and make purchases with your oversight",
    watchOutFor: "Autonomous AI agents can make mistakes with real consequences—wrong purchases, missed appointments, privacy exposure. Start with low-stakes tasks and supervise carefully."
  },
  "E2025_GROK_3": {
    whatHappened: "xAI released Grok 3, claiming significant advances in reasoning and capabilities. It represented continued competition in the advanced AI assistant space.",
    thinkOfItLike: "Another powerful player entering the AI assistant competition, similar to how multiple smartphone companies compete with different features and approaches.",
    howItAffectsYou: "More AI competition means:\n- More choices for AI assistants\n- Pressure for better features and lower prices\n- Different approaches to AI design\n- Continued rapid improvement",
    watchOutFor: "Competition can drive innovation but also hype. Evaluate AI tools based on how well they work for you, not marketing claims."
  },
  "E2025_CLAUDE_3_7_SONNET": {
    whatHappened: "Anthropic released Claude 3.7 Sonnet with extended thinking capabilities and a 128K context window, representing continued advancement in AI assistant capabilities.",
    thinkOfItLike: "Like a student who can now work through problems step-by-step in their head while also remembering more of the book they're reading.",
    howItAffectsYou: "Claude's improvements help with:\n- Complex problem solving\n- Longer document analysis\n- Better reasoning on difficult questions\n- More nuanced conversations",
    watchOutFor: "More capable AI still makes mistakes. Don't assume better models are always correct—verify important information."
  },
  "E2025_LLAMA_4": {
    whatHappened: "Meta released LLaMA 4, continuing the open-weights language model series with improved capabilities. It maintained Meta's commitment to open AI development.",
    thinkOfItLike: "A new version of an open-source software library that anyone can use and modify. Companies and researchers worldwide can build on this foundation.",
    howItAffectsYou: "Open models like LLaMA 4 enable:\n- More AI applications and startups\n- Local AI that runs on your devices\n- Research into AI capabilities\n- Competition with proprietary AI",
    watchOutFor: "Open models can be fine-tuned for any purpose, including harmful ones. The openness that enables innovation also enables misuse."
  },
  "E2025_DWARKESH_KARPATHY": {
    whatHappened: "Andrej Karpathy discussed the future of AI agents and autonomous systems in a widely-viewed interview, sharing perspectives on how AI will increasingly act independently in the world.",
    thinkOfItLike: "A leading AI researcher sharing their vision of where the technology is heading—useful for understanding expert perspectives on AI's future.",
    howItAffectsYou: "Expert perspectives help you:\n- Understand where AI is heading\n- Prepare for coming changes\n- Evaluate AI hype vs. reality\n- Make informed decisions about AI",
    watchOutFor: "Even experts disagree about AI's future. Take predictions as informed opinions, not certainties."
  },
  "E2025_GEMINI_3": {
    whatHappened: "Google released Gemini 3, advancing their flagship AI model's capabilities. It continued Google's competition in the advanced AI assistant space.",
    thinkOfItLike: "Google's latest entry in the AI assistant competition, with improvements building on their previous models.",
    howItAffectsYou: "Gemini improvements affect:\n- Google Search and Assistant\n- Google Workspace AI features\n- Android AI capabilities\n- Competition driving overall AI improvement",
    watchOutFor: "Google integrates AI deeply into its products. Be aware of how AI is being used in the tools you rely on."
  },
  "E2025_CLAUDE_OPUS_4_5": {
    whatHappened: "Anthropic released Claude Opus 4.5, representing a significant upgrade in their most capable model. It featured improvements in reasoning, analysis, and handling complex tasks.",
    thinkOfItLike: "The flagship model getting a major upgrade—like going from a reliable sedan to a luxury car with more power and features.",
    howItAffectsYou: "Claude Opus 4.5 offers:\n- Better performance on difficult tasks\n- More nuanced and detailed responses\n- Improved analysis capabilities\n- Higher quality for complex work",
    watchOutFor: "More capable models are typically more expensive. Consider whether you need the most powerful model or if a smaller one suffices."
  },
  "E2025_STARCLOUD_SPACE_AI": {
    whatHappened: "AI systems began being deployed in space applications, bringing machine learning capabilities to satellite operations, space exploration, and orbital systems.",
    thinkOfItLike: "AI moving from earth-bound computers to space—helping satellites and spacecraft make decisions autonomously where communication delays make remote control impractical.",
    howItAffectsYou: "Space AI affects:\n- Satellite internet reliability\n- Weather prediction accuracy\n- Space exploration missions\n- Future space services",
    watchOutFor: "Space AI operates where humans can't easily intervene if something goes wrong. The stakes for reliability are especially high."
  },
  "E2025_GPT_5_2": {
    whatHappened: "OpenAI released GPT-5.2, representing continued advancement of their flagship model series. It featured improvements across reasoning, knowledge, and capabilities.",
    thinkOfItLike: "The latest version of the model that powers ChatGPT, with the improvements you'd expect from continued development.",
    howItAffectsYou: "GPT updates affect:\n- ChatGPT performance\n- API-based AI applications\n- AI capabilities across many products\n- Competitive pressure on other AI companies",
    watchOutFor: "Newer doesn't always mean better for your specific needs. Test whether updates actually improve your use cases."
  },
  "E2025_GPT_IMAGE_1_5": {
    whatHappened: "OpenAI released GPT-Image 1.5, advancing their image generation capabilities with improved quality, consistency, and control.",
    thinkOfItLike: "An upgraded camera that takes better photos with more control over the results. Better image AI means better creative tools.",
    howItAffectsYou: "Image AI improvements mean:\n- Better photo editing tools\n- More capable creative applications\n- More realistic AI-generated images\n- Easier visual content creation",
    watchOutFor: "More realistic image generation makes it harder to distinguish real from fake photos. Be cautious about trusting images, especially surprising or inflammatory ones."
  },
  "E2020_GPT3_API": {
    whatHappened: "OpenAI released the GPT-3 API, letting developers build applications using GPT-3's capabilities. For the first time, businesses could easily add advanced AI language abilities to their products.",
    thinkOfItLike: "Instead of having to build your own power plant, you can just plug into the electrical grid. The API let anyone use GPT-3's power without building their own AI.",
    howItAffectsYou: "The GPT-3 API enabled:\n- AI writing assistants\n- Customer service chatbots\n- Code generation tools\n- Countless AI-powered apps you use today",
    watchOutFor: "When you use an AI-powered app, your inputs often go to OpenAI or similar companies. Be mindful of privacy when entering sensitive information."
  },
  "E2021_COPILOT": {
    whatHappened: "GitHub Copilot used AI (based on Codex) to suggest code as programmers type. It learned from billions of lines of public code and could complete entire functions from brief descriptions.",
    thinkOfItLike: "Autocomplete for programming, but much smarter. Instead of guessing the next word, it suggests the next several lines of code.",
    howItAffectsYou: "AI coding assistants affect:\n- Software development speed\n- Learning to code (helpful examples)\n- Job market for programmers (changing, not disappearing)\n- Quality and security of software",
    tryItYourself: "If you're curious about coding, try ChatGPT for programming questions. It uses similar technology to explain code and help with problems.",
    watchOutFor: "AI-suggested code may have bugs, security flaws, or be copied from copyrighted sources. Professional programmers still need to review AI suggestions carefully."
  },
  "E2023_ENTERPRISE_AI": {
    whatHappened: "2023 saw widespread enterprise adoption of AI, with companies integrating ChatGPT-style tools into business workflows. Microsoft's Copilot, Google's Duet AI, and custom solutions proliferated.",
    thinkOfItLike: "AI moving from tech demos to everyday business tools, like how computers went from special projects to every desk.",
    howItAffectsYou: "Enterprise AI affects:\n- How companies you interact with operate\n- Customer service quality (for better or worse)\n- Work processes across industries\n- Job market and skill requirements",
    watchOutFor: "Not all AI implementations are good. Some businesses use AI to cut costs in ways that harm service quality. Be prepared for occasional frustrating AI interactions."
  },
  "E2024_AI_AGENTS": {
    whatHappened: "2024 saw increased focus on AI agents—AI systems that can take actions autonomously, not just answer questions. These agents could browse the web, use tools, and accomplish multi-step tasks.",
    thinkOfItLike: "AI evolving from a knowledge assistant to a capable helper who can actually do things. Instead of telling you how to book a flight, the AI books it for you.",
    howItAffectsYou: "AI agents are changing:\n- How digital tasks get done\n- Customer service interactions\n- Personal productivity tools\n- The boundary between advice and action",
    watchOutFor: "Agents that can take actions can also make mistakes with real consequences. Be cautious about giving AI agents access to sensitive systems or the ability to spend money."
  },
  "E2024_RAG_ADOPTION": {
    whatHappened: "RAG (Retrieval-Augmented Generation) became standard practice, with most AI applications combining generation with information retrieval. This improved accuracy and enabled AI to access current information.",
    thinkOfItLike: "AI assistants learning to use libraries and databases, not just their memory. Ask a question, and the AI looks it up before answering.",
    howItAffectsYou: "RAG adoption means:\n- More accurate AI responses\n- AI that can access current information\n- Better company chatbots with real data\n- Reduced (but not eliminated) AI hallucinations",
    watchOutFor: "RAG improves accuracy but isn't perfect. AI can still misinterpret retrieved information or combine facts incorrectly. Verify important information."
  }
};

// Main function
async function main() {
  console.log('Reading layered-content.json...');
  const content: LayeredContent = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf-8'));

  let added = 0;
  let skipped = 0;

  for (const [id, milestone] of Object.entries(content)) {
    // Skip metadata entries
    if (!id.startsWith('E')) continue;

    const m = milestone as Milestone;

    // Skip if already has plainEnglish
    if (m.plainEnglish) {
      skipped++;
      continue;
    }

    // Check if we have content for this milestone
    if (plainEnglishContent[id]) {
      m.plainEnglish = plainEnglishContent[id];
      added++;
      console.log(`  Added plainEnglish for ${id}`);
    } else {
      console.log(`  WARNING: No plainEnglish content defined for ${id}`);
    }
  }

  console.log(`\nWriting updated content...`);
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2));

  console.log(`\nDone!`);
  console.log(`  Added: ${added}`);
  console.log(`  Skipped (already had content): ${skipped}`);
}

main().catch(console.error);
