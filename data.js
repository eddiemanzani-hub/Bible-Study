// Static Bible book metadata: name, number of chapters, and testament.
// Chapter counts are fixed facts about the Bible's structure (66 protestant canon books).
const BIBLE_BOOKS = [
  // Old Testament
  { name: "Genesis", chapters: 50, testament: "OT" },
  { name: "Exodus", chapters: 40, testament: "OT" },
  { name: "Leviticus", chapters: 27, testament: "OT" },
  { name: "Numbers", chapters: 36, testament: "OT" },
  { name: "Deuteronomy", chapters: 34, testament: "OT" },
  { name: "Joshua", chapters: 24, testament: "OT" },
  { name: "Judges", chapters: 21, testament: "OT" },
  { name: "Ruth", chapters: 4, testament: "OT" },
  { name: "1 Samuel", chapters: 31, testament: "OT" },
  { name: "2 Samuel", chapters: 24, testament: "OT" },
  { name: "1 Kings", chapters: 22, testament: "OT" },
  { name: "2 Kings", chapters: 25, testament: "OT" },
  { name: "1 Chronicles", chapters: 29, testament: "OT" },
  { name: "2 Chronicles", chapters: 36, testament: "OT" },
  { name: "Ezra", chapters: 10, testament: "OT" },
  { name: "Nehemiah", chapters: 13, testament: "OT" },
  { name: "Esther", chapters: 10, testament: "OT" },
  { name: "Job", chapters: 42, testament: "OT" },
  { name: "Psalms", chapters: 150, testament: "OT" },
  { name: "Proverbs", chapters: 31, testament: "OT" },
  { name: "Ecclesiastes", chapters: 12, testament: "OT" },
  { name: "Song of Solomon", chapters: 8, testament: "OT" },
  { name: "Isaiah", chapters: 66, testament: "OT" },
  { name: "Jeremiah", chapters: 52, testament: "OT" },
  { name: "Lamentations", chapters: 5, testament: "OT" },
  { name: "Ezekiel", chapters: 48, testament: "OT" },
  { name: "Daniel", chapters: 12, testament: "OT" },
  { name: "Hosea", chapters: 14, testament: "OT" },
  { name: "Joel", chapters: 3, testament: "OT" },
  { name: "Amos", chapters: 9, testament: "OT" },
  { name: "Obadiah", chapters: 1, testament: "OT" },
  { name: "Jonah", chapters: 4, testament: "OT" },
  { name: "Micah", chapters: 7, testament: "OT" },
  { name: "Nahum", chapters: 3, testament: "OT" },
  { name: "Habakkuk", chapters: 3, testament: "OT" },
  { name: "Zephaniah", chapters: 3, testament: "OT" },
  { name: "Haggai", chapters: 2, testament: "OT" },
  { name: "Zechariah", chapters: 14, testament: "OT" },
  { name: "Malachi", chapters: 4, testament: "OT" },
  // New Testament
  { name: "Matthew", chapters: 28, testament: "NT" },
  { name: "Mark", chapters: 16, testament: "NT" },
  { name: "Luke", chapters: 24, testament: "NT" },
  { name: "John", chapters: 21, testament: "NT" },
  { name: "Acts", chapters: 28, testament: "NT" },
  { name: "Romans", chapters: 16, testament: "NT" },
  { name: "1 Corinthians", chapters: 16, testament: "NT" },
  { name: "2 Corinthians", chapters: 13, testament: "NT" },
  { name: "Galatians", chapters: 6, testament: "NT" },
  { name: "Ephesians", chapters: 6, testament: "NT" },
  { name: "Philippians", chapters: 4, testament: "NT" },
  { name: "Colossians", chapters: 4, testament: "NT" },
  { name: "1 Thessalonians", chapters: 5, testament: "NT" },
  { name: "2 Thessalonians", chapters: 3, testament: "NT" },
  { name: "1 Timothy", chapters: 6, testament: "NT" },
  { name: "2 Timothy", chapters: 4, testament: "NT" },
  { name: "Titus", chapters: 3, testament: "NT" },
  { name: "Philemon", chapters: 1, testament: "NT" },
  { name: "Hebrews", chapters: 13, testament: "NT" },
  { name: "James", chapters: 5, testament: "NT" },
  { name: "1 Peter", chapters: 5, testament: "NT" },
  { name: "2 Peter", chapters: 3, testament: "NT" },
  { name: "1 John", chapters: 5, testament: "NT" },
  { name: "2 John", chapters: 1, testament: "NT" },
  { name: "3 John", chapters: 1, testament: "NT" },
  { name: "Jude", chapters: 1, testament: "NT" },
  { name: "Revelation", chapters: 22, testament: "NT" },
];

// Total chapters across the whole 66-book canon (used for the reading progress bar).
const TOTAL_CHAPTERS = BIBLE_BOOKS.reduce((sum, b) => sum + b.chapters, 0);

// Public-domain translations hosted by bible-api.com (no API key required).
const TRANSLATIONS = [
  { id: "web", name: "World English Bible (WEB)" },
  { id: "kjv", name: "King James Version (KJV)" },
  { id: "asv", name: "American Standard Version (ASV)" },
  { id: "bbe", name: "Bible in Basic English (BBE)" },
];

// Common function words excluded when picking a word to blank out for quiz
// questions -- keeps blanks on meaningful nouns/verbs/names instead of glue words.
const QUIZ_STOPWORDS = new Set([
  "the","and","but","for","are","was","were","been","being","have","has","had",
  "not","this","that","these","those","then","than","from","with","into","unto",
  "upon","over","under","after","before","again","against","among","between",
  "during","each","every","more","most","much","many","never","none","only",
  "other","same","such","very","while","about","above","across","also","any",
  "because","been","both","cannot","could","did","does","doing","down","either",
  "else","further","get","gets","got","hence","her","here","hers","herself",
  "him","himself","his","how","however","its","itself","just","know","let",
  "may","might","mine","must","myself","neither","nor","now","off","once",
  "onto","our","ours","ourselves","out","own","rather","said","saith","she",
  "should","since","some","somewhat","still","take","than","that","their",
  "theirs","them","themselves","then","thence","there","therefore","thereby",
  "thereof","these","they","thine","thing","think","this","those","thou",
  "though","through","throughout","thus","thy","too","toward","towards",
  "unless","until","upon","use","used","very","was","were","what","whatever",
  "when","whence","whenever","where","whereas","wherein","whereof","wherever",
  "whether","which","while","who","whoever","whom","whose","why","will",
  "with","within","without","would","yet","you","your","yours","yourself",
  "yourselves","shall","unto","hath","doth","ye","behold","yea","nay","also",
  "come","came","comes","went","goes","going","made","make","makes","said",
  "says","saying","one","two","three","four","five","six","seven","eight",
  "nine","ten","first","second","third","fourth","fifth","sixth","seventh",
  "eighth","ninth","tenth","twelfth","great","greater","greatest","lesser",
  "least","more","most","much","many","little","less","good","bad","new","old",
  "man","men","day","days","son","sons","see","saw","seen","like","own",
  "beginning","end","ends","midst","surface","kind","kinds","form","void",
]);

// Fallback distractor words used when a chapter is too short to supply
// enough alternative words on its own (e.g. very short Psalms).
const QUIZ_FALLBACK_WORDS = [
  "Israel", "covenant", "servant", "glory", "spirit", "temple", "prophet",
  "kingdom", "righteousness", "wilderness", "sacrifice", "disciple", "gospel",
  "salvation", "commandment", "wisdom", "mercy", "judgment", "nations",
  "priest", "altar", "blessing", "inheritance", "shepherd", "multitude",
];

// Notable Bible place names, used so quiz questions can be steered toward
// locations rather than arbitrary vocabulary.
const QUIZ_PLACE_NAMES = [
  "Eden", "Nod", "Ararat", "Babel", "Babylon", "Egypt", "Canaan", "Haran", "Ur",
  "Sodom", "Gomorrah", "Moriah", "Bethel", "Peniel", "Goshen", "Sinai", "Horeb",
  "Midian", "Moab", "Edom", "Ammon", "Aram", "Jericho", "Ai", "Gilgal", "Shechem",
  "Shiloh", "Hebron", "Mizpah", "Ramah", "Gibeah", "Gilead", "Bashan", "Carmel",
  "Jerusalem", "Zion", "Bethlehem", "Nazareth", "Galilee", "Judea", "Samaria",
  "Capernaum", "Bethany", "Bethsaida", "Cana", "Gethsemane", "Golgotha", "Emmaus",
  "Jordan", "Tyre", "Sidon", "Damascus", "Nineveh", "Assyria", "Persia", "Media",
  "Elam", "Cush", "Ophir", "Tarshish", "Susa", "Antioch", "Philippi", "Corinth",
  "Ephesus", "Thessalonica", "Athens", "Cyprus", "Crete", "Patmos", "Rome",
  "Macedonia", "Colossae", "Galatia", "Cappadocia", "Pontus", "Malta", "Sharon",
  "Kadesh", "Beersheba", "Dan", "Joppa", "Caesarea", "Tiberias", "Decapolis",
];

// Theologically or narratively significant terms; a blanked-out word from
// this list makes for a more meaningful quiz question than a generic noun.
const QUIZ_IMPORTANT_TERMS = [
  "covenant", "ark", "altar", "tabernacle", "temple", "sacrifice", "offering",
  "offerings", "commandment", "commandments", "law", "prophet", "prophets",
  "priest", "priests", "kingdom", "angel", "angels", "spirit", "glory",
  "salvation", "sin", "sins", "redemption", "blood", "cross", "resurrection",
  "baptism", "disciple", "disciples", "apostle", "apostles", "gospel",
  "parable", "miracle", "famine", "plague", "plagues", "exile", "captivity",
  "idol", "idols", "sabbath", "circumcision", "manna", "passover", "judgment",
  "wisdom", "righteousness", "righteous", "mercy", "grace", "faith", "faithful",
  "blessing", "blessings", "curse", "inheritance", "promise", "wilderness",
  "flood", "rainbow", "dream", "vision", "throne", "scepter", "crown", "sword",
  "chariot", "chariots", "locust", "locusts", "drought", "queen", "king",
  "prince", "servant", "shepherd", "shepherds", "prayer", "worship", "holy",
  "light", "darkness", "heaven", "heavens", "earth", "water", "waters",
  "image", "likeness", "creature", "creatures", "beast", "beasts", "wind",
  "cloud", "clouds", "fire", "sea", "seas", "land", "garden", "tree", "trees",
  "fruit", "seed", "serpent", "soul", "breath", "generations", "nations",
];

const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Yellow" },
  { id: "green", label: "Green" },
  { id: "blue", label: "Blue" },
  { id: "pink", label: "Pink" },
  { id: "purple", label: "Purple" },
];
