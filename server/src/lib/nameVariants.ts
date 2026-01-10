/**
 * Common Name Variants Dictionary
 * Sprint 44 - Key Figures Data Foundation
 *
 * Maps first names to their common nicknames/variants.
 * Used by nameNormalizer to generate alternative spellings for matching.
 */

/**
 * Dictionary of first name variants
 * Key: lowercase canonical first name
 * Value: array of common nicknames/variants (lowercase)
 */
export const NAME_VARIANTS: Record<string, string[]> = {
  // A
  abraham: ['abe'],
  albert: ['al', 'bert'],
  alexander: ['alex', 'al', 'xander', 'sandy'],
  alexandra: ['alex', 'lexi', 'sandra'],
  alfred: ['al', 'alf', 'fred'],
  andrew: ['andy', 'drew'],
  anthony: ['tony', 'ant'],
  arthur: ['art', 'artie'],

  // B
  barbara: ['barb', 'barbie', 'babs'],
  benjamin: ['ben', 'benji', 'benny'],
  bernard: ['bernie', 'bern'],

  // C
  catherine: ['cathy', 'kate', 'katie', 'cath', 'cat'],
  charles: ['charlie', 'chuck', 'chas'],
  christopher: ['chris', 'kit', 'topher'],
  clarence: ['clare'],

  // D
  daniel: ['dan', 'danny'],
  david: ['dave', 'davey'],
  deborah: ['debbie', 'deb'],
  donald: ['don', 'donnie'],
  dorothy: ['dot', 'dotty', 'dottie'],
  douglas: ['doug'],

  // E
  edward: ['ed', 'eddie', 'ted', 'teddy', 'ned'],
  elizabeth: ['liz', 'lizzy', 'beth', 'betty', 'eliza', 'libby'],
  emily: ['em', 'emmy'],
  eugene: ['gene'],

  // F
  florence: ['flo', 'florrie'],
  francis: ['frank', 'fran'],
  frederick: ['fred', 'freddy', 'freddie', 'fritz'],

  // G
  geoffrey: ['geoff', 'jeff'],
  george: ['georgie'],
  gerald: ['gerry', 'jerry'],
  gregory: ['greg'],

  // H
  harold: ['harry', 'hal'],
  harrison: ['harry'],
  helen: ['nellie', 'nell'],
  henry: ['harry', 'hank', 'hal'],
  herbert: ['herb', 'bert'],

  // I
  isaac: ['ike'],

  // J
  jacob: ['jake', 'jack'],
  james: ['jim', 'jimmy', 'jamie'],
  janet: ['jan'],
  jennifer: ['jen', 'jenny', 'jenn'],
  jerome: ['jerry'],
  jessica: ['jess', 'jessie'],
  john: ['jack', 'johnny', 'jon'],
  jonathan: ['jon', 'jonny', 'john'],
  joseph: ['joe', 'joey'],
  joshua: ['josh'],
  judith: ['judy', 'judi'],
  julia: ['julie'],

  // K
  katherine: ['kate', 'katie', 'kathy', 'kat', 'kit'],
  kathleen: ['kate', 'kathy', 'kat'],
  kenneth: ['ken', 'kenny'],
  kimberly: ['kim', 'kimmy'],

  // L
  lawrence: ['larry', 'laurie'],
  leonard: ['leo', 'len', 'lenny'],
  louis: ['lou', 'louie'],

  // M
  margaret: ['maggie', 'meg', 'peggy', 'marge', 'margie'],
  maria: ['mary'],
  matthew: ['matt', 'matty'],
  maureen: ['mo'],
  maxwell: ['max'],
  michael: ['mike', 'mikey', 'mick', 'mickey'],
  mildred: ['millie', 'milly'],

  // N
  nathaniel: ['nate', 'nathan', 'nat'],
  nicholas: ['nick', 'nicky'],
  nicole: ['nikki', 'nicki'],

  // O
  olivia: ['liv', 'livvy'],

  // P
  patricia: ['pat', 'patty', 'patsy', 'tricia'],
  patrick: ['pat', 'paddy'],
  peter: ['pete'],
  philip: ['phil'],

  // R
  raymond: ['ray'],
  rebecca: ['becky', 'becca', 'beck'],
  richard: ['rick', 'ricky', 'dick', 'rich', 'richie'],
  robert: ['rob', 'robbie', 'bob', 'bobby', 'bert'],
  roderick: ['rod', 'roddy'],
  ronald: ['ron', 'ronnie'],
  russell: ['russ', 'rusty'],

  // S
  samantha: ['sam', 'sammy'],
  samuel: ['sam', 'sammy'],
  sandra: ['sandy', 'san'],
  sarah: ['sally', 'sadie'],
  sebastian: ['seb'],
  stephen: ['steve', 'stevie'],
  steven: ['steve', 'stevie'],
  stuart: ['stu'],
  susan: ['sue', 'susie', 'suzy'],
  suzanne: ['sue', 'suzy', 'suzie'],

  // T
  terrence: ['terry'],
  theodore: ['ted', 'teddy', 'theo'],
  theresa: ['terry', 'tess', 'tessie'],
  thomas: ['tom', 'tommy'],
  timothy: ['tim', 'timmy'],

  // V
  victoria: ['vicky', 'vicki', 'tori'],
  vincent: ['vince', 'vinny', 'vin'],
  virginia: ['ginny', 'ginger'],

  // W
  walter: ['walt', 'wally'],
  william: ['will', 'willy', 'bill', 'billy', 'liam'],

  // Y
  yoshua: ['yoshi'],

  // Z
  zachary: ['zach', 'zack'],
};

/**
 * Get nicknames for a given first name
 */
export function getNicknames(firstName: string): string[] {
  const lower = firstName.toLowerCase();
  return NAME_VARIANTS[lower] || [];
}

/**
 * Check if two first names are likely the same person
 * (one is a nickname of the other)
 */
export function areFirstNamesEquivalent(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  // Same name
  if (n1 === n2) return true;

  // Check if n1 is a nickname of n2
  const n2Nicknames = NAME_VARIANTS[n2] || [];
  if (n2Nicknames.includes(n1)) return true;

  // Check if n2 is a nickname of n1
  const n1Nicknames = NAME_VARIANTS[n1] || [];
  if (n1Nicknames.includes(n2)) return true;

  // Check if they share a common canonical form
  for (const [canonical, nicknames] of Object.entries(NAME_VARIANTS)) {
    const allForms = [canonical, ...nicknames];
    if (allForms.includes(n1) && allForms.includes(n2)) {
      return true;
    }
  }

  return false;
}
