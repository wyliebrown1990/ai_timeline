/**
 * Add content from "A Brief History of Intelligence" by Max Bennett
 * Run with: DATABASE_URL=... npx tsx scripts/add-bhoi-content.ts
 */

import { prisma } from '../server/src/db';

// =============================================================================
// GLOSSARY TERMS
// =============================================================================

const glossaryTerms = [
  // Brain Structures
  {
    term: 'Basal Ganglia',
    category: 'model_architecture',
    shortDefinition: 'Ancient brain structures involved in reinforcement learning, action selection, and habit formation',
    fullDefinition: 'The basal ganglia are a group of subcortical nuclei found in all vertebrates, dating back over 500 million years. They play a central role in reinforcement learning by integrating dopamine reward signals to select and reinforce beneficial actions. The basal ganglia are considered the biological implementation of temporal difference learning, making them a key inspiration for modern RL algorithms.',
    businessContext: 'Understanding basal ganglia function has directly influenced the development of reinforcement learning algorithms used in robotics, game-playing AI, and recommendation systems.',
    example: 'When you learn to ride a bike, your basal ganglia gradually encode which motor patterns lead to balance (reward) versus falling (punishment).',
    inMeetingExample: 'The basal ganglia are essentially nature\'s implementation of Q-learning - they\'ve been doing reinforcement learning for 500 million years.',
  },
  {
    term: 'Neocortex',
    category: 'model_architecture',
    shortDefinition: 'Six-layered outer brain region in mammals enabling sensory processing, prediction, and abstract thought',
    fullDefinition: 'The neocortex is the newest part of the mammalian brain, emerging around 200 million years ago. It consists of six layers of neurons organized into vertical columns that process hierarchical information. The neocortex enables mammals to build internal models of the world, predict sensory inputs, and engage in abstract reasoning. It is the biological basis for the predictive processing theory of brain function.',
    businessContext: 'The neocortex\'s hierarchical structure inspired convolutional neural networks and deep learning architectures.',
    example: 'Your neocortex allows you to recognize a friend\'s face from any angle, predict where a thrown ball will land, and understand abstract concepts like justice.',
    inMeetingExample: 'The neocortex is basically a prediction machine - it\'s constantly generating expectations about what will happen next, which is exactly what modern generative models try to do.',
  },
  {
    term: 'Hippocampus',
    category: 'model_architecture',
    shortDefinition: 'Brain region essential for episodic memory formation and spatial navigation',
    fullDefinition: 'The hippocampus is a brain structure that emerged in early mammals around 200 million years ago. It is crucial for forming new episodic memories (remembering specific events) and for spatial navigation through cognitive maps. The hippocampus enables "mental time travel" - the ability to simulate past experiences and imagine future scenarios. It works in concert with the neocortex to consolidate memories during sleep.',
    businessContext: 'The hippocampus inspired memory replay mechanisms in AI and the development of experience replay in deep reinforcement learning.',
    example: 'When you remember your last birthday party, your hippocampus retrieves the specific details of that event, allowing you to mentally re-experience it.',
    inMeetingExample: 'Experience replay in DQN was directly inspired by how the hippocampus replays memories during sleep to consolidate learning.',
  },
  {
    term: 'Prefrontal Cortex',
    category: 'model_architecture',
    shortDefinition: 'Front brain region responsible for executive functions, planning, and decision-making',
    fullDefinition: 'The prefrontal cortex (PFC) is the anterior part of the frontal lobes, highly developed in primates and especially humans. It is responsible for executive functions including working memory, planning, decision-making, and impulse control. The PFC enables abstract reasoning, goal-directed behavior, and the ability to consider future consequences of actions.',
    businessContext: 'The PFC\'s role in planning and decision-making has influenced the design of AI agents that need to reason about long-term goals.',
    example: 'When you resist eating a cookie now to save room for dinner later, your prefrontal cortex is overriding immediate impulses for longer-term goals.',
    inMeetingExample: 'The prefrontal cortex is like the CEO of the brain - it\'s doing the high-level planning and deciding which goals to pursue.',
  },
  {
    term: 'Granular Prefrontal Cortex',
    category: 'model_architecture',
    shortDefinition: 'Primate-specific PFC regions with granular layer 4, enabling abstract reasoning',
    fullDefinition: 'The granular prefrontal cortex is a region unique to primates that contains a well-developed layer 4 (the granular layer). This structure emerged around 50 million years ago and enables the most abstract forms of reasoning, including theory of mind, analogical thinking, and metacognition. It represents a key evolutionary innovation that distinguishes primate cognition.',
    businessContext: 'Understanding granular PFC has implications for developing AI systems capable of abstract reasoning and theory of mind.',
    example: 'When you realize that your friend doesn\'t know about a surprise party you\'re planning, your granular PFC is enabling you to model their mental state.',
    inMeetingExample: 'The granular PFC is what lets primates reason about reasoning - it\'s the neural substrate for metacognition and theory of mind.',
  },
  {
    term: 'Thalamus',
    category: 'model_architecture',
    shortDefinition: 'Brain relay station connecting sensory inputs to cortex',
    fullDefinition: 'The thalamus is a central hub in the brain that relays sensory and motor signals to the cerebral cortex. Nearly all sensory information (except smell) passes through the thalamus before reaching the cortex. It also plays a role in regulating consciousness, sleep, and alertness. The thalamus acts as a gatekeeper, filtering which information reaches conscious awareness.',
    businessContext: 'The thalamus\'s gating function has inspired attention mechanisms in neural networks.',
    example: 'When you\'re focused on reading, your thalamus helps filter out background noise so you can concentrate on the text.',
    inMeetingExample: 'The thalamus works like an attention gate - it decides what sensory information is important enough to pass to the cortex.',
  },
  {
    term: 'Amygdala',
    category: 'model_architecture',
    shortDefinition: 'Brain region processing emotions, especially fear and threat detection',
    fullDefinition: 'The amygdala is an almond-shaped structure in the temporal lobe that processes emotions, particularly fear and threat detection. It evolved early in vertebrate history to enable rapid responses to danger. The amygdala can trigger fight-or-flight responses before conscious awareness, demonstrating a fast, parallel processing pathway separate from cortical reasoning.',
    businessContext: 'The amygdala\'s rapid threat detection has influenced safety systems in AI and robotics.',
    example: 'When you jump back from a snake-like shape before consciously recognizing it\'s just a stick, your amygdala triggered that reflex.',
    inMeetingExample: 'The amygdala is nature\'s anomaly detector - it evolved to spot threats fast, even if it sometimes gives false positives.',
  },
  {
    term: 'Striatum',
    category: 'model_architecture',
    shortDefinition: 'Part of basal ganglia receiving dopamine signals for reward learning',
    fullDefinition: 'The striatum is a major component of the basal ganglia that receives dopamine projections from the midbrain. It is central to reward-based learning, encoding the value of actions and states. The striatum integrates inputs from the cortex with dopamine reward signals to learn which actions lead to positive outcomes.',
    businessContext: 'The striatum\'s function directly maps to the value function in reinforcement learning algorithms.',
    example: 'When a particular restaurant consistently satisfies you, your striatum encodes the positive value of choosing that restaurant.',
    inMeetingExample: 'The striatum is essentially computing Q-values - it\'s learning which state-action pairs lead to rewards.',
  },
  {
    term: 'Cerebellum',
    category: 'model_architecture',
    shortDefinition: 'Brain region for motor coordination and timing, contains more neurons than rest of brain',
    fullDefinition: 'The cerebellum (Latin for "little brain") is located at the back of the brain and contains more neurons than all other brain regions combined. It is essential for motor coordination, balance, and precise timing of movements. The cerebellum learns to predict the sensory consequences of motor commands, enabling smooth, coordinated movement.',
    businessContext: 'The cerebellum\'s predictive motor control has influenced robotics and control systems.',
    example: 'When you learn to play piano, your cerebellum gradually refines the timing of your finger movements until they become automatic.',
    inMeetingExample: 'The cerebellum is doing forward modeling - predicting what sensory feedback will result from motor commands.',
  },

  // Learning Mechanisms
  {
    term: 'Reinforcement Learning',
    category: 'core_concept',
    shortDefinition: 'Learning paradigm where agents learn through rewards and punishments',
    fullDefinition: 'Reinforcement learning (RL) is a computational approach to learning where an agent learns to make decisions by receiving rewards or punishments for its actions. The agent\'s goal is to maximize cumulative reward over time. RL is inspired by behaviorist psychology and maps closely to how the brain\'s dopamine system guides learning through reward prediction errors.',
    businessContext: 'RL powers game-playing AI (AlphaGo), robotics, recommendation systems, and autonomous vehicles.',
    example: 'A robot learning to walk through trial and error, receiving positive feedback for staying balanced and negative feedback for falling.',
    inMeetingExample: 'RL is essentially how the brain learns - try things, see what works, do more of that. Dopamine is the reward signal.',
  },
  {
    term: 'Temporal Difference Learning',
    category: 'technical_term',
    shortDefinition: 'RL algorithm that learns from differences between successive predictions',
    fullDefinition: 'Temporal Difference (TD) learning is a reinforcement learning algorithm developed by Richard Sutton that learns from the difference between predictions at successive time steps. TD learning doesn\'t wait for the final outcome but updates predictions based on other predictions. This approach was later found to closely match how dopamine neurons in the brain encode reward prediction errors.',
    businessContext: 'TD learning is the foundation for algorithms like Q-learning and is used in game AI, trading systems, and robotics.',
    example: 'In chess, TD learning updates the evaluation of a position based on how good the next position turns out to be, without waiting for the game to end.',
    inMeetingExample: 'TD learning predates the neuroscience discovery, but it turned out to exactly match how dopamine neurons work - a remarkable convergence of AI and biology.',
  },
  {
    term: 'Prediction Error',
    category: 'core_concept',
    shortDefinition: 'Difference between expected and actual outcomes, drives learning',
    fullDefinition: 'Prediction error is the difference between what an agent expects to happen and what actually happens. In the brain, prediction errors are signaled by dopamine neurons and drive learning - when outcomes are better than expected (positive prediction error), the preceding actions are reinforced. Prediction error is central to both reinforcement learning and predictive processing theories of brain function.',
    businessContext: 'Prediction error signals are used in training neural networks (as loss functions) and in anomaly detection systems.',
    example: 'When a vending machine gives you two candy bars instead of one, the positive surprise (prediction error) makes you more likely to use that machine again.',
    inMeetingExample: 'The brain learns from surprises, not from expected outcomes. If everything goes as predicted, there\'s no prediction error and no learning signal.',
  },
  {
    term: 'Dopamine Prediction Error',
    category: 'technical_term',
    shortDefinition: 'Dopamine neurons signal reward prediction errors, key to reinforcement learning',
    fullDefinition: 'Dopamine prediction error refers to the discovery by Wolfram Schultz that dopamine neurons encode reward prediction errors rather than rewards themselves. When a reward is better than expected, dopamine neurons fire; when it\'s as expected, they don\'t change; when it\'s worse than expected, they decrease firing. This mechanism implements temporal difference learning in the brain.',
    businessContext: 'This discovery validated computational reinforcement learning models and has influenced AI research directions.',
    example: 'The first time you taste an unexpectedly delicious dish, dopamine floods your brain. By the tenth time, if it tastes the same as expected, dopamine doesn\'t spike.',
    inMeetingExample: 'Schultz\'s discovery was huge - it showed that the brain literally implements TD learning. The math matched the biology.',
  },
  {
    term: 'Classical Conditioning',
    category: 'core_concept',
    shortDefinition: 'Learning where neutral stimulus becomes associated with a response (Pavlovian)',
    fullDefinition: 'Classical conditioning, discovered by Ivan Pavlov, is a form of learning where a neutral stimulus becomes associated with a meaningful stimulus, eventually triggering the same response. Pavlov famously demonstrated this by pairing a bell with food, causing dogs to salivate at the bell alone. Classical conditioning reveals fundamental principles of associative learning that apply across species.',
    businessContext: 'Classical conditioning principles are used in marketing, user experience design, and understanding consumer behavior.',
    example: 'After hearing your phone notification sound followed by exciting messages many times, the sound alone now triggers anticipation.',
    inMeetingExample: 'Pavlov showed that the brain is fundamentally a prediction machine - it learns to anticipate what comes next.',
  },
  {
    term: 'Operant Conditioning',
    category: 'core_concept',
    shortDefinition: 'Learning where behaviors are modified by consequences (rewards/punishments)',
    fullDefinition: 'Operant conditioning, developed by B.F. Skinner building on Thorndike\'s work, is learning where behaviors are modified by their consequences. Behaviors followed by rewards are reinforced (more likely to recur), while those followed by punishments are weakened. Operant conditioning is the behavioral basis for reinforcement learning algorithms.',
    businessContext: 'Operant conditioning principles are applied in gamification, employee incentive programs, and training AI systems.',
    example: 'A child who receives praise for cleaning their room becomes more likely to clean it in the future.',
    inMeetingExample: 'Operant conditioning is basically RL in biology - the brain is doing policy gradient updates based on reward signals.',
  },
  {
    term: 'Hebbian Learning',
    category: 'technical_term',
    shortDefinition: 'Neurons that fire together wire together; basis of associative learning',
    fullDefinition: 'Hebbian learning, proposed by Donald Hebb in 1949, is the principle that when one neuron repeatedly contributes to firing another, the connection between them strengthens. Often summarized as "neurons that fire together wire together," this rule explains how associations form in the brain and is a foundational concept in both neuroscience and neural network training.',
    businessContext: 'Hebbian learning inspired early neural network algorithms and continues to influence unsupervised learning approaches.',
    example: 'After repeatedly seeing lightning followed by thunder, neurons representing these events become strongly connected in your brain.',
    inMeetingExample: 'Hebb basically described backpropagation before computers existed - strengthen connections that lead to correct outputs.',
  },
  {
    term: 'Credit Assignment Problem',
    category: 'technical_term',
    shortDefinition: 'Challenge of determining which actions led to delayed rewards',
    fullDefinition: 'The credit assignment problem is the challenge of determining which of many preceding actions or decisions contributed to a delayed reward or punishment. When you win a chess game, which of your 40 moves was responsible? The brain and AI systems must solve this problem to learn effectively, typically through temporal difference methods or eligibility traces.',
    businessContext: 'Credit assignment is crucial in training AI systems with sparse or delayed rewards, such as game-playing AI or long-horizon robotics.',
    example: 'If you get a promotion, which of your actions over the past year actually contributed to that outcome?',
    inMeetingExample: 'Credit assignment is why RL is hard - when you win after 1000 steps, you need to figure out which steps mattered.',
  },
  {
    term: 'Actor-Critic Architecture',
    category: 'model_architecture',
    shortDefinition: 'RL approach with separate policy (actor) and value (critic) networks',
    fullDefinition: 'Actor-critic is a reinforcement learning architecture that separates the policy (actor) that selects actions from the value function (critic) that evaluates states. The critic provides a baseline for reducing variance in policy gradient updates. This architecture maps to the brain\'s organization, where the prefrontal cortex acts as the actor and the striatum as the critic.',
    businessContext: 'Actor-critic methods like A3C and PPO are widely used in robotics, game AI, and continuous control tasks.',
    example: 'In learning to play tennis, your "actor" decides how to swing the racket while your "critic" evaluates whether that was a good shot.',
    inMeetingExample: 'Actor-critic mirrors brain architecture - the PFC proposes actions and the striatum evaluates them. Evolution figured this out first.',
  },
  {
    term: 'Model-Based Learning',
    category: 'core_concept',
    shortDefinition: 'Learning that builds internal models of the environment',
    fullDefinition: 'Model-based learning involves building an internal model of how the environment works and using that model to plan actions through mental simulation. This approach, enabled by the mammalian neocortex and hippocampus, allows for flexible planning and imagination of hypothetical scenarios without needing to experience them directly.',
    businessContext: 'Model-based RL is more sample-efficient and is used in robotics, game AI (AlphaZero), and planning systems.',
    example: 'Before rearranging your furniture, you imagine different configurations in your mind to see what might work best.',
    inMeetingExample: 'Model-based learning is what sets mammals apart - we can simulate the world in our heads before acting.',
  },
  {
    term: 'Model-Free Learning',
    category: 'core_concept',
    shortDefinition: 'Learning directly from experience without explicit world models',
    fullDefinition: 'Model-free learning involves learning directly from experience without building an explicit model of the environment. Actions are learned through repeated trial and error, associating states with values or actions. While less flexible than model-based learning, model-free methods are simpler and can handle complex environments where models are hard to learn.',
    businessContext: 'Model-free RL (Q-learning, policy gradient) is widely used in games, robotics, and recommendation systems.',
    example: 'Learning to ride a bike through practice without consciously modeling the physics of balance.',
    inMeetingExample: 'Model-free is habits - you don\'t think about it, you just do it. Fast but inflexible.',
  },

  // Evolutionary Concepts
  {
    term: 'Cambrian Explosion',
    category: 'core_concept',
    shortDefinition: 'Rapid diversification of animal life ~530 million years ago',
    fullDefinition: 'The Cambrian Explosion was a period approximately 530 million years ago when most major animal phyla appeared in the fossil record over a relatively short geological period. This explosion of diversity coincided with the evolution of eyes and predator-prey relationships, driving an "arms race" that selected for increasingly sophisticated nervous systems and behaviors.',
    businessContext: 'The Cambrian Explosion provides insight into how competition drives rapid innovation, relevant to technology and market dynamics.',
    example: 'Before the Cambrian, most life was simple. Within 20 million years, almost every major body plan we see today had evolved.',
    inMeetingExample: 'The Cambrian Explosion was triggered by eyes - suddenly there was a visual arms race that drove brain evolution.',
  },
  {
    term: 'Bilateral Symmetry',
    category: 'technical_term',
    shortDefinition: 'Body plan with left-right symmetry, enabling directed movement',
    fullDefinition: 'Bilateral symmetry is a body organization where the left and right sides are mirror images. This body plan emerged around 600 million years ago and enabled directed movement with a clear front (sensory) and back (motor) end. Bilateral symmetry drove the centralization of the nervous system into a brain at the front of the body.',
    businessContext: 'Bilateral symmetry concepts influence robotics design and understanding of sensorimotor organization.',
    example: 'Unlike radially symmetric jellyfish, worms have a distinct head with eyes and a brain, enabling them to move purposefully toward food.',
    inMeetingExample: 'Bilateral symmetry was a prerequisite for brains - you need a front end to centralize sensory processing.',
  },
  {
    term: 'Triune Brain',
    category: 'core_concept',
    shortDefinition: 'MacLean\'s theory of three evolutionary brain layers (reptilian, limbic, neocortex)',
    fullDefinition: 'The triune brain theory, proposed by Paul MacLean, suggests the brain evolved in three stages: the reptilian brain (brainstem, basic survival), the limbic system (emotions, memory), and the neocortex (higher cognition). While oversimplified, this framework usefully illustrates how newer brain regions evolved on top of older ones, with each layer adding new capabilities.',
    businessContext: 'The triune brain model is used in marketing and design to understand emotional vs. rational decision-making.',
    example: 'When you impulsively grab a cookie (limbic) but then put it back thinking about your diet (neocortex), you\'re seeing these systems interact.',
    inMeetingExample: 'The triune brain is oversimplified but useful - evolution added new capabilities on top of old ones rather than redesigning from scratch.',
  },
  {
    term: 'Encephalization Quotient',
    category: 'technical_term',
    shortDefinition: 'Measure of brain size relative to body size across species',
    fullDefinition: 'Encephalization quotient (EQ) measures how large an animal\'s brain is compared to what would be expected for its body size. Humans have the highest EQ of any animal (around 7.5), meaning our brains are 7.5 times larger than expected. EQ correlates with cognitive abilities across species and reflects the evolutionary investment in neural processing.',
    businessContext: 'EQ provides a framework for comparing cognitive capabilities across different scales, relevant to AI benchmarking discussions.',
    example: 'Dolphins have an EQ around 4, making them among the most encephalized non-human animals.',
    inMeetingExample: 'Humans don\'t have the biggest brains absolutely, but we have the highest EQ - the most brain per body mass.',
  },
  {
    term: 'Cortical Columns',
    category: 'model_architecture',
    shortDefinition: 'Vertical units of neurons in neocortex that process similar information',
    fullDefinition: 'Cortical columns are vertical units of neurons in the neocortex, spanning all six layers, that process similar types of information. Each column acts as a basic processing unit, and the neocortex can be thought of as a repeating array of these modular units. This organization suggests a universal algorithm that the cortex applies across different sensory modalities.',
    businessContext: 'Cortical columns inspired the design of Hierarchical Temporal Memory (HTM) and other neocortex-inspired AI architectures.',
    example: 'A column in visual cortex might process edges at a particular orientation, while a neighboring column processes a slightly different orientation.',
    inMeetingExample: 'The neocortex reuses the same column architecture everywhere - vision, hearing, touch. It\'s like a universal learning algorithm.',
  },
  {
    term: 'Theory of Mind',
    category: 'core_concept',
    shortDefinition: 'Ability to understand that others have beliefs, desires, and intentions',
    fullDefinition: 'Theory of mind is the cognitive ability to understand that other individuals have their own beliefs, desires, intentions, and perspectives that may differ from one\'s own. This ability emerged in primates around 50 million years ago and is essential for complex social interaction, cooperation, and deception. It is closely linked to the development of the granular prefrontal cortex.',
    businessContext: 'Theory of mind is increasingly relevant for AI systems that need to model user intentions and mental states.',
    example: 'Understanding that your friend doesn\'t know about the surprise party requires modeling their (lack of) knowledge.',
    inMeetingExample: 'Theory of mind is what makes us social - and it\'s still a challenge for AI. LLMs have some capability but it\'s inconsistent.',
  },
  {
    term: 'Social Brain Hypothesis',
    category: 'core_concept',
    shortDefinition: 'Theory that primate brains evolved for managing complex social relationships',
    fullDefinition: 'The social brain hypothesis proposes that the large brains of primates evolved primarily to manage complex social relationships rather than for ecological challenges like finding food. The number of social relationships a primate can maintain correlates with neocortex size. This hypothesis explains why humans, with our massive neocortex, can maintain social networks of around 150 individuals (Dunbar\'s number).',
    businessContext: 'The social brain hypothesis informs social network design and understanding of human organizational limits.',
    example: 'Chimpanzees in larger groups have larger neocortices, suggesting the brain expanded to track social alliances and hierarchies.',
    inMeetingExample: 'We didn\'t evolve big brains to solve math problems - we evolved them to navigate social politics.',
  },
  {
    term: 'Recursive Grammar',
    category: 'core_concept',
    shortDefinition: 'Linguistic structure allowing sentences within sentences, unique to humans',
    fullDefinition: 'Recursive grammar is the ability to embed structures within structures in language, such as putting sentences inside sentences ("I think that you believe that she knows..."). This capability is unique to human language and emerged around 200,000 years ago. Recursive grammar enables infinite expressiveness from finite elements and is considered a key distinguishing feature of human cognition.',
    businessContext: 'Recursive grammar is relevant to natural language processing, compiler design, and understanding the limits of language models.',
    example: 'The sentence "The dog that the cat that the rat bit chased ran away" uses recursive embedding.',
    inMeetingExample: 'Recursive grammar is what makes human language infinite - you can always add another level of embedding.',
  },

  // Computational Concepts
  {
    term: 'Generative Model',
    category: 'model_architecture',
    shortDefinition: 'Model that learns to generate data by modeling underlying distributions',
    fullDefinition: 'A generative model learns to generate new data samples by modeling the underlying probability distribution of the training data. Rather than just classifying inputs, generative models can create new, plausible examples. The neocortex is hypothesized to function as a generative model, constantly predicting sensory inputs from internal models of the world.',
    businessContext: 'Generative models power image generation (DALL-E), language models (GPT), and creative AI applications.',
    example: 'GPT-4 is a generative model that can produce novel text by predicting what words should come next.',
    inMeetingExample: 'The brain is essentially a generative model - it\'s constantly generating predictions about what sensory input to expect.',
  },
  {
    term: 'Predictive Processing',
    category: 'core_concept',
    shortDefinition: 'Theory that brains constantly predict sensory inputs and learn from errors',
    fullDefinition: 'Predictive processing is a theory that the brain is fundamentally a prediction machine, constantly generating predictions about incoming sensory input and learning from the prediction errors. Rather than passively receiving information, the brain actively constructs its experience through prediction. This framework unifies perception, action, and learning under a single principle.',
    businessContext: 'Predictive processing has influenced AI architectures and our understanding of perception, attention, and consciousness.',
    example: 'When you reach for a cup, your brain predicts the weight and texture. Surprise (prediction error) only occurs if the prediction is wrong.',
    inMeetingExample: 'Predictive processing says the brain is doing Bayesian inference all the time - prior beliefs meet new evidence.',
  },
  {
    term: 'Free Energy Principle',
    category: 'technical_term',
    shortDefinition: 'Framework proposing organisms minimize surprise through prediction',
    fullDefinition: 'The free energy principle, developed by Karl Friston, proposes that all adaptive systems minimize "free energy" - a measure of surprise or prediction error. Organisms do this through two means: updating internal models (perception/learning) or acting on the world (action). This unifying framework attempts to explain all brain function under one mathematical principle.',
    businessContext: 'The free energy principle offers a theoretical framework for understanding intelligent behavior that could guide AI development.',
    example: 'When you feel uncomfortable in a hot room, you either update your expectations or act (open a window) to minimize the surprise of unexpected heat.',
    inMeetingExample: 'The free energy principle says there\'s one objective function for all of life - minimize surprise. It\'s elegant but controversial.',
  },
  {
    term: 'Hierarchical Predictive Coding',
    category: 'model_architecture',
    shortDefinition: 'Brain architecture with layers making and correcting predictions',
    fullDefinition: 'Hierarchical predictive coding is a model of brain function where each level of processing makes predictions about the level below and sends down those predictions. Lower levels send up prediction errors that update higher-level models. This creates an efficient communication system where only unexpected information needs to be transmitted up the hierarchy.',
    businessContext: 'Hierarchical predictive coding has influenced neural network architectures and efficient video compression.',
    example: 'Visual cortex predicts what patterns to expect based on context. Only when something unexpected appears does a strong signal propagate upward.',
    inMeetingExample: 'Hierarchical predictive coding explains why the brain is so efficient - it only transmits surprises, not everything.',
  },
  {
    term: 'World Model',
    category: 'core_concept',
    shortDefinition: 'Internal representation of the environment used for planning and prediction',
    fullDefinition: 'A world model is an internal representation of how the environment works, enabling an agent to predict outcomes of actions without having to try them. The mammalian neocortex and hippocampus together implement world models that allow for mental simulation, planning, and imagination. World models enable sample-efficient learning by reducing the need for real-world trial and error.',
    businessContext: 'World models are central to model-based RL, robotics, and Yann LeCun\'s vision for more human-like AI.',
    example: 'Before crossing a street, you mentally simulate whether you can make it across before the approaching car arrives.',
    inMeetingExample: 'World models are what distinguish mammals from simpler animals - we can simulate before we act.',
  },
  {
    term: 'Sensory-Motor Loop',
    category: 'technical_term',
    shortDefinition: 'Cycle of sensing, processing, and acting that defines agent behavior',
    fullDefinition: 'The sensory-motor loop is the continuous cycle of sensing the environment, processing that information, and taking action that affects the environment. This loop is fundamental to all adaptive behavior, from the simplest reflexes to complex planning. Understanding this loop as closed (actions affect future sensing) is essential for understanding embodied intelligence.',
    businessContext: 'The sensory-motor loop is fundamental to robotics, autonomous systems, and embodied AI.',
    example: 'When walking, you continuously sense your balance, process that information, and adjust your muscles, which then changes what you sense.',
    inMeetingExample: 'The sensory-motor loop is why embodiment matters - you can\'t separate perception from action.',
  },
  {
    term: 'Value Function',
    category: 'technical_term',
    shortDefinition: 'Function estimating expected future rewards from a state',
    fullDefinition: 'A value function estimates the expected cumulative future reward from a given state (or state-action pair). In the brain, the striatum is thought to encode value functions that guide action selection. Value functions are central to reinforcement learning, providing a measure of how good it is to be in a particular situation.',
    businessContext: 'Value functions are used in decision-making systems, game AI, and any RL application.',
    example: 'In chess, the value function estimates how likely you are to win from a given board position.',
    inMeetingExample: 'The value function is what the critic in actor-critic learns - it\'s estimating V(s) or Q(s,a).',
  },
  {
    term: 'Policy',
    category: 'technical_term',
    shortDefinition: 'Mapping from states to actions that defines agent behavior',
    fullDefinition: 'A policy is a mapping from states to actions that defines how an agent behaves. It can be deterministic (always taking the same action in a state) or stochastic (probability distribution over actions). In the brain, the prefrontal cortex and motor cortex implement policies that convert perceived states into motor commands.',
    businessContext: 'Policies are the core output of RL training and are deployed in robotics, game AI, and decision systems.',
    example: 'A trained chess policy determines which move to make given any board position.',
    inMeetingExample: 'The policy is what the actor in actor-critic learns - it\'s π(a|s), the probability of each action given the state.',
  },
];

// =============================================================================
// KEY FIGURES / PERSONS
// =============================================================================

const persons = [
  // Historical Scientists
  {
    id: 'edward-thorndike',
    canonicalName: 'Edward Thorndike',
    slug: 'edward-thorndike',
    role: 'researcher',
    shortBio: 'American psychologist who discovered the law of effect through puzzle box experiments with cats, laying the foundation for operant conditioning and reinforcement learning.',
    fullBio: 'Edward Lee Thorndike (1874-1949) was an American psychologist whose work on animal behavior and learning theory had a profound impact on psychology and later on artificial intelligence. His puzzle box experiments with cats demonstrated that learning occurs through trial and error, with successful behaviors becoming more likely over time - what he called the "law of effect." This principle became the foundation for behaviorist psychology and, decades later, for reinforcement learning algorithms in AI.',
    focusAreas: JSON.stringify(['behavioral psychology', 'learning theory', 'educational psychology']),
    aliases: JSON.stringify(['Edward L. Thorndike', 'E.L. Thorndike']),
  },
  {
    id: 'ivan-pavlov',
    canonicalName: 'Ivan Pavlov',
    slug: 'ivan-pavlov',
    role: 'researcher',
    shortBio: 'Russian physiologist who discovered classical conditioning through his famous experiments on dog salivation, revealing fundamental principles of associative learning.',
    fullBio: 'Ivan Petrovich Pavlov (1849-1936) was a Russian physiologist who won the Nobel Prize in Physiology in 1904. While studying digestion in dogs, he made the serendipitous discovery that dogs would salivate not just at food, but at stimuli associated with food - the bell that preceded feeding. This "classical conditioning" revealed that the brain forms associations between stimuli, a fundamental principle of learning that applies across species and has influenced both psychology and AI.',
    focusAreas: JSON.stringify(['physiology', 'classical conditioning', 'digestion']),
    aliases: JSON.stringify(['I.P. Pavlov', 'Pavlov']),
  },
  {
    id: 'bf-skinner',
    canonicalName: 'B.F. Skinner',
    slug: 'bf-skinner',
    role: 'researcher',
    shortBio: 'American psychologist who developed operant conditioning and radical behaviorism, showing how behavior is shaped by consequences.',
    fullBio: 'Burrhus Frederic Skinner (1904-1990) was an American psychologist who developed the theory of operant conditioning, building on Thorndike\'s law of effect. His "Skinner box" experiments demonstrated how behaviors are shaped by their consequences - reinforcement increases behavior frequency, while punishment decreases it. Skinner\'s work on schedules of reinforcement and behavior shaping directly influenced the development of reinforcement learning in AI.',
    focusAreas: JSON.stringify(['behaviorism', 'operant conditioning', 'behavior analysis']),
    aliases: JSON.stringify(['Burrhus Frederic Skinner', 'B. F. Skinner']),
  },
  {
    id: 'paul-maclean',
    canonicalName: 'Paul MacLean',
    slug: 'paul-maclean',
    role: 'researcher',
    shortBio: 'American neuroscientist who proposed the triune brain theory, describing the brain as three evolutionary layers: reptilian, limbic, and neocortex.',
    fullBio: 'Paul D. MacLean (1913-2007) was an American physician and neuroscientist who developed the influential triune brain hypothesis. He proposed that the human brain consists of three evolutionary layers: the reptilian complex (basic survival functions), the limbic system (emotions and memory), and the neocortex (higher cognition). While oversimplified, this framework remains useful for understanding how newer brain regions evolved atop older ones.',
    focusAreas: JSON.stringify(['evolutionary neuroscience', 'limbic system', 'brain evolution']),
    aliases: JSON.stringify(['Paul D. MacLean']),
  },
  {
    id: 'donald-hebb',
    canonicalName: 'Donald Hebb',
    slug: 'donald-hebb',
    role: 'researcher',
    shortBio: 'Canadian psychologist who formulated Hebbian learning - the principle that neurons that fire together wire together.',
    fullBio: 'Donald Olding Hebb (1904-1985) was a Canadian psychologist who made foundational contributions to neuropsychology. In his 1949 book "The Organization of Behavior," he proposed what became known as Hebbian learning: when one neuron repeatedly contributes to firing another, the connection between them strengthens. This principle, often summarized as "neurons that fire together wire together," became foundational for understanding synaptic plasticity and inspired early neural network algorithms.',
    focusAreas: JSON.stringify(['neuropsychology', 'learning', 'synaptic plasticity']),
    aliases: JSON.stringify(['D.O. Hebb', 'Donald O. Hebb']),
  },

  // Modern Neuroscientists
  {
    id: 'wolfram-schultz',
    canonicalName: 'Wolfram Schultz',
    slug: 'wolfram-schultz',
    role: 'researcher',
    shortBio: 'German-British neuroscientist who discovered that dopamine neurons encode reward prediction errors, validating computational models of reinforcement learning.',
    fullBio: 'Wolfram Schultz (born 1944) is a German-British neuroscientist at the University of Cambridge whose work revolutionized our understanding of the brain\'s reward system. In the 1990s, he discovered that dopamine neurons don\'t simply respond to rewards, but encode reward prediction errors - the difference between expected and received rewards. This finding validated the temporal difference learning algorithm from AI, demonstrating a remarkable convergence between computational theory and neurobiology.',
    focusAreas: JSON.stringify(['dopamine', 'reward learning', 'decision-making', 'neuroeconomics']),
    aliases: JSON.stringify([]),
  },
  {
    id: 'karl-friston',
    canonicalName: 'Karl Friston',
    slug: 'karl-friston',
    role: 'researcher',
    shortBio: 'British neuroscientist who developed the free energy principle and predictive processing framework for understanding brain function.',
    fullBio: 'Karl John Friston (born 1959) is a British neuroscientist and the scientific director of the Wellcome Trust Centre for Neuroimaging at UCL. He is the most cited neuroscientist in the world and is known for developing the free energy principle and active inference framework. His work proposes that all brain function can be understood as minimizing "free energy" (surprise/prediction error), unifying perception, learning, and action under one mathematical principle.',
    focusAreas: JSON.stringify(['computational neuroscience', 'predictive processing', 'free energy principle', 'brain imaging']),
    aliases: JSON.stringify(['K.J. Friston', 'Karl J. Friston']),
  },
  {
    id: 'joseph-ledoux',
    canonicalName: 'Joseph LeDoux',
    slug: 'joseph-ledoux',
    role: 'researcher',
    shortBio: 'American neuroscientist known for his research on the amygdala and the neural basis of emotions, particularly fear.',
    fullBio: 'Joseph E. LeDoux (born 1949) is an American neuroscientist and the Henry and Lucy Moses Professor of Science at NYU. His research focuses on how the brain detects and responds to threats, particularly the role of the amygdala in fear processing. LeDoux has shown that fear responses can occur before conscious awareness, demonstrating parallel processing pathways in the brain that bypass cortical reasoning.',
    focusAreas: JSON.stringify(['amygdala', 'fear', 'emotion', 'memory']),
    aliases: JSON.stringify(['Joseph E. LeDoux', 'Joe LeDoux']),
  },
  {
    id: 'read-montague',
    canonicalName: 'Read Montague',
    slug: 'read-montague',
    role: 'researcher',
    shortBio: 'American neuroscientist who connected temporal difference learning algorithms to dopamine function in the brain.',
    fullBio: 'P. Read Montague (born 1960) is an American neuroscientist known for his work connecting computational reinforcement learning to neurobiology. Along with Peter Dayan and others, he showed that dopamine neurons implement temporal difference learning, bridging AI algorithms and brain function. He developed hyperscanning methods to study interacting brains and has applied computational models to understanding mental illness.',
    focusAreas: JSON.stringify(['computational neuroscience', 'dopamine', 'decision-making', 'neuroeconomics']),
    aliases: JSON.stringify(['P. Read Montague']),
  },
  {
    id: 'david-marr',
    canonicalName: 'David Marr',
    slug: 'david-marr',
    role: 'researcher',
    shortBio: 'British neuroscientist who proposed the three levels of analysis framework for understanding computation in the brain.',
    fullBio: 'David Courtnay Marr (1945-1980) was a British neuroscientist who made foundational contributions to computational neuroscience despite dying at age 35. His book "Vision" (published posthumously in 1982) proposed three levels of analysis for understanding information processing systems: computational (what problem is being solved?), algorithmic (how is it solved?), and implementational (how is it physically realized?). This framework remains influential in both neuroscience and AI.',
    focusAreas: JSON.stringify(['computational neuroscience', 'vision', 'cerebellum']),
    aliases: JSON.stringify(['David C. Marr']),
  },

  // AI Researchers with neuroscience connections
  {
    id: 'richard-sutton',
    canonicalName: 'Richard Sutton',
    slug: 'richard-sutton',
    role: 'researcher',
    shortBio: 'Canadian computer scientist who developed temporal difference learning and co-authored the foundational textbook on reinforcement learning.',
    fullBio: 'Richard S. Sutton (born 1956) is a Canadian computer scientist and professor at the University of Alberta, considered one of the founders of modern reinforcement learning. He developed temporal difference learning, which was later found to match how dopamine neurons work in the brain. His textbook "Reinforcement Learning: An Introduction" (with Andrew Barto) is the standard reference in the field. He has advocated for the importance of prediction and world models in AI.',
    focusAreas: JSON.stringify(['reinforcement learning', 'temporal difference learning', 'AI']),
    aliases: JSON.stringify(['Richard S. Sutton', 'Rich Sutton']),
  },
  {
    id: 'andrew-barto',
    canonicalName: 'Andrew Barto',
    slug: 'andrew-barto',
    role: 'researcher',
    shortBio: 'American computer scientist who co-developed actor-critic architecture and wrote the foundational reinforcement learning textbook.',
    fullBio: 'Andrew G. Barto (born 1948) is an American computer scientist and professor emeritus at UMass Amherst. Along with Richard Sutton, he developed foundational reinforcement learning algorithms including the actor-critic architecture, which separates policy and value estimation. Their textbook "Reinforcement Learning: An Introduction" established the field and connected RL to neuroscience and psychology.',
    focusAreas: JSON.stringify(['reinforcement learning', 'actor-critic', 'machine learning']),
    aliases: JSON.stringify(['Andrew G. Barto', 'Andy Barto']),
  },
  {
    id: 'dileep-george',
    canonicalName: 'Dileep George',
    slug: 'dileep-george',
    role: 'researcher',
    shortBio: 'Indian-American AI researcher who developed Hierarchical Temporal Memory, a neocortex-inspired AI approach, and co-founded Numenta and Vicarious.',
    fullBio: 'Dileep George is an AI researcher known for his work on neocortex-inspired artificial intelligence. He co-founded Vicarious AI (acquired by Alphabet in 2022) and was a co-founder of Numenta with Jeff Hawkins. His work on Hierarchical Temporal Memory (HTM) and probabilistic graphical models attempts to capture the computational principles of the neocortex, emphasizing the importance of temporal patterns and cortical column structure.',
    focusAreas: JSON.stringify(['hierarchical temporal memory', 'neocortex', 'probabilistic models', 'robotics']),
    aliases: JSON.stringify([]),
  },
];

// =============================================================================
// MILESTONES
// =============================================================================

const milestones = [
  // Scientific Discoveries (Modern Era) - These fit the timeline format better
  {
    id: 'E1897_PAVLOVIAN_CONDITIONING',
    title: 'Pavlov Discovers Classical Conditioning',
    description: 'Ivan Pavlov discovers that dogs can be conditioned to salivate in response to a neutral stimulus (bell) when paired with food. This discovery of classical conditioning reveals fundamental principles of associative learning that would later influence both behavioral psychology and AI.',
    date: new Date('1897-01-01'),
    category: 'RESEARCH',
    significance: 5,
    tags: JSON.stringify(['neuroscience', 'psychology', 'learning', 'classical-conditioning']),
    tldr: 'Pavlov shows that neutral stimuli can trigger learned responses when paired with rewards.',
    simpleExplanation: 'Dogs learned to drool at a bell because it predicted food. This showed brains make predictions about what comes next.',
    businessImpact: 'Foundation for understanding consumer behavior, brand associations, and habit formation in product design.',
  },
  {
    id: 'E1898_LAW_OF_EFFECT',
    title: 'Thorndike Formulates Law of Effect',
    description: 'Edward Thorndike publishes his puzzle box experiments with cats, formulating the Law of Effect: behaviors followed by satisfying outcomes are strengthened. This becomes the foundation for operant conditioning and, later, reinforcement learning in AI.',
    date: new Date('1898-01-01'),
    category: 'RESEARCH',
    significance: 4,
    tags: JSON.stringify(['neuroscience', 'psychology', 'reinforcement-learning', 'behaviorism']),
    tldr: 'Thorndike shows that animals learn by trial and error, repeating actions that lead to rewards.',
    simpleExplanation: 'Cats in puzzle boxes learned to escape by trial and error, doing more of what worked. This is the basic idea behind reinforcement learning.',
    businessImpact: 'Foundation for gamification, incentive systems, and reinforcement learning applications.',
  },
  {
    id: 'E1949_HEBBIAN_LEARNING',
    title: 'Hebb Proposes Neural Learning Rule',
    description: 'Donald Hebb publishes "The Organization of Behavior," proposing that when neurons fire together repeatedly, their connections strengthen. This "Hebbian learning" rule becomes foundational for both neuroscience and neural network training.',
    date: new Date('1949-01-01'),
    category: 'RESEARCH',
    significance: 5,
    tags: JSON.stringify(['neuroscience', 'neural-networks', 'learning', 'synaptic-plasticity']),
    tldr: 'Hebb explains how learning happens at the neuron level: connections that fire together strengthen together.',
    simpleExplanation: 'Neurons that activate at the same time become more connected. This explains how memories and skills form in the brain.',
    businessImpact: 'Foundation for neural network learning algorithms that power modern AI.',
  },
  {
    id: 'E1960_TRIUNE_BRAIN',
    title: 'MacLean Proposes Triune Brain Theory',
    description: 'Paul MacLean develops the triune brain hypothesis, proposing that the human brain consists of three evolutionary layers: the reptilian brain (survival), the limbic system (emotions), and the neocortex (reasoning). While later refined, this framework remains influential.',
    date: new Date('1960-01-01'),
    category: 'RESEARCH',
    significance: 4,
    tags: JSON.stringify(['neuroscience', 'brain-evolution', 'limbic-system']),
    tldr: 'MacLean suggests the brain evolved in layers, each adding new capabilities.',
    simpleExplanation: 'Our brain has older parts for survival, a middle part for emotions, and a newer outer layer for thinking. Evolution built new on top of old.',
    businessImpact: 'Framework for understanding emotional vs. rational decision-making in marketing and UX.',
  },
  {
    id: 'E1988_TD_LEARNING',
    title: 'Sutton Formalizes Temporal Difference Learning',
    description: 'Richard Sutton publishes "Learning to Predict by the Methods of Temporal Differences," formalizing TD learning. This algorithm learns from the difference between successive predictions without waiting for final outcomes, becoming foundational to modern reinforcement learning.',
    date: new Date('1988-01-01'),
    category: 'RESEARCH',
    significance: 5,
    tags: JSON.stringify(['reinforcement-learning', 'machine-learning', 'algorithms']),
    tldr: 'Sutton creates an algorithm that learns from moment-to-moment prediction errors, not just final outcomes.',
    simpleExplanation: 'TD learning updates predictions based on what happens next, not waiting for the end. This makes learning much faster.',
    businessImpact: 'Foundation for game-playing AI, robotics, and recommendation systems.',
  },
  {
    id: 'E1997_DOPAMINE_PREDICTION_ERROR',
    title: 'Schultz Discovers Dopamine Prediction Error',
    description: 'Wolfram Schultz publishes research showing that dopamine neurons encode reward prediction errors, not rewards themselves. Neurons fire when rewards exceed expectations and decrease when they fall short. This validates the temporal difference learning algorithm in biology.',
    date: new Date('1997-01-01'),
    category: 'RESEARCH',
    significance: 5,
    tags: JSON.stringify(['neuroscience', 'dopamine', 'reinforcement-learning', 'prediction-error']),
    tldr: 'Schultz shows dopamine neurons signal surprise, not reward - validating AI reinforcement learning in biology.',
    simpleExplanation: 'Dopamine spikes when something is better than expected, not just when good things happen. The brain literally does TD learning.',
    businessImpact: 'Validated convergence between AI and neuroscience, influencing both fields.',
  },
  {
    id: 'E2005_FREE_ENERGY',
    title: 'Friston Publishes Free Energy Principle',
    description: 'Karl Friston publishes "A Theory of Cortical Responses," introducing the free energy principle. This framework proposes that all brain function can be understood as minimizing prediction error (free energy), unifying perception, learning, and action under one mathematical principle.',
    date: new Date('2005-01-01'),
    category: 'RESEARCH',
    significance: 4,
    tags: JSON.stringify(['neuroscience', 'predictive-processing', 'free-energy', 'theory']),
    tldr: 'Friston proposes one principle for all brain function: minimize surprise through better predictions.',
    simpleExplanation: 'The brain tries to minimize surprise by constantly predicting what will happen and updating when wrong.',
    businessImpact: 'Influential theoretical framework for understanding intelligence and building AI systems.',
  },
];

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('Starting content import from "A Brief History of Intelligence"...\n');

  // Add Glossary Terms
  console.log('=== Adding Glossary Terms ===');
  let glossaryCreated = 0;
  let glossarySkipped = 0;

  for (const term of glossaryTerms) {
    try {
      const existing = await prisma.glossaryTerm.findFirst({
        where: { term: term.term },
      });

      if (existing) {
        console.log(`  Skipped (exists): ${term.term}`);
        glossarySkipped++;
        continue;
      }

      await prisma.glossaryTerm.create({
        data: {
          term: term.term,
          shortDefinition: term.shortDefinition,
          fullDefinition: term.fullDefinition,
          businessContext: term.businessContext || null,
          example: term.example || null,
          inMeetingExample: term.inMeetingExample || null,
          category: term.category,
          relatedTermIds: JSON.stringify([]),
          relatedMilestoneIds: JSON.stringify([]),
        },
      });
      console.log(`  Created: ${term.term}`);
      glossaryCreated++;
    } catch (error) {
      console.error(`  Error creating ${term.term}:`, error);
    }
  }
  console.log(`\nGlossary: ${glossaryCreated} created, ${glossarySkipped} skipped\n`);

  // Add Persons
  console.log('=== Adding Key Figures ===');
  let personsCreated = 0;
  let personsSkipped = 0;

  for (const person of persons) {
    try {
      const existing = await prisma.person.findFirst({
        where: { slug: person.slug },
      });

      if (existing) {
        console.log(`  Skipped (exists): ${person.canonicalName}`);
        personsSkipped++;
        continue;
      }

      await prisma.person.create({
        data: person,
      });
      console.log(`  Created: ${person.canonicalName}`);
      personsCreated++;
    } catch (error) {
      console.error(`  Error creating ${person.canonicalName}:`, error);
    }
  }
  console.log(`\nPersons: ${personsCreated} created, ${personsSkipped} skipped\n`);

  // Add Milestones
  console.log('=== Adding Milestones ===');
  let milestonesCreated = 0;
  let milestonesSkipped = 0;

  for (const milestone of milestones) {
    try {
      const existing = await prisma.milestone.findFirst({
        where: { id: milestone.id },
      });

      if (existing) {
        console.log(`  Skipped (exists): ${milestone.title}`);
        milestonesSkipped++;
        continue;
      }

      await prisma.milestone.create({
        data: {
          ...milestone,
          contributors: JSON.stringify([]),
        },
      });
      console.log(`  Created: ${milestone.title}`);
      milestonesCreated++;
    } catch (error) {
      console.error(`  Error creating ${milestone.title}:`, error);
    }
  }
  console.log(`\nMilestones: ${milestonesCreated} created, ${milestonesSkipped} skipped\n`);

  // Summary
  console.log('=== Import Complete ===');
  console.log(`Glossary Terms: ${glossaryCreated} created, ${glossarySkipped} skipped`);
  console.log(`Key Figures: ${personsCreated} created, ${personsSkipped} skipped`);
  console.log(`Milestones: ${milestonesCreated} created, ${milestonesSkipped} skipped`);
  console.log('\nNote: Run subject classification to assign subjects to new content.');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
