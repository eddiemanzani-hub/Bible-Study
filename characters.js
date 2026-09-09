// A curated set of notable Bible characters -- not literally every named person
// in the text (there are hundreds of minor genealogical names), but the figures
// a Bible study app's reader would actually want a reference on. Each entry's
// book/chapter marks that person's first appearance in the canonical text.
const BIBLE_CHARACTERS = [
  // ---- Genesis ----
  { name: "Adam", book: "Genesis", chapter: 2, testament: "OT", importance: "The first human, whose disobedience in Eden introduces sin into the world." },
  { name: "Eve", book: "Genesis", chapter: 2, testament: "OT", importance: "The first woman, formed from Adam; deceived by the serpent into eating the forbidden fruit." },
  { name: "Cain", book: "Genesis", chapter: 4, testament: "OT", importance: "Adam and Eve's firstborn son; kills his brother Abel in the Bible's first murder." },
  { name: "Abel", book: "Genesis", chapter: 4, testament: "OT", importance: "Adam and Eve's second son, a shepherd murdered by his brother Cain; his offering pleased God." },
  { name: "Seth", book: "Genesis", chapter: 4, testament: "OT", importance: "Third son of Adam and Eve, born after Abel's death; ancestor of Noah and, eventually, Jesus." },
  { name: "Enoch", book: "Genesis", chapter: 5, testament: "OT", importance: "A pre-flood patriarch who 'walked with God' and was taken up without dying." },
  { name: "Noah", book: "Genesis", chapter: 5, testament: "OT", importance: "Built the ark and survived the great flood with his family, becoming humanity's new ancestor." },
  { name: "Shem", book: "Genesis", chapter: 5, testament: "OT", importance: "One of Noah's three sons; ancestor of the Semitic peoples, including Abraham." },
  { name: "Ham", book: "Genesis", chapter: 5, testament: "OT", importance: "One of Noah's sons; his descendants include Canaan and various nations." },
  { name: "Japheth", book: "Genesis", chapter: 5, testament: "OT", importance: "One of Noah's sons; traditionally seen as ancestor of Indo-European peoples." },
  { name: "Nimrod", book: "Genesis", chapter: 10, testament: "OT", importance: "A mighty hunter and early king, associated with founding Babel and other cities." },
  { name: "Abraham", book: "Genesis", chapter: 11, testament: "OT", importance: "Called by God to leave his homeland; father of the Israelite nation and model of faith." },
  { name: "Sarah", book: "Genesis", chapter: 11, testament: "OT", importance: "Abraham's wife, who miraculously bears Isaac in her old age." },
  { name: "Lot", book: "Genesis", chapter: 11, testament: "OT", importance: "Abraham's nephew, rescued from Sodom before its destruction." },
  { name: "Melchizedek", book: "Genesis", chapter: 14, testament: "OT", importance: "Mysterious king-priest of Salem who blesses Abram; later seen as a foreshadowing of Christ." },
  { name: "Hagar", book: "Genesis", chapter: 16, testament: "OT", importance: "Sarah's servant, mother of Ishmael through Abraham." },
  { name: "Ishmael", book: "Genesis", chapter: 16, testament: "OT", importance: "Abraham's first son, through Hagar; traditionally regarded as ancestor of the Arab peoples." },
  { name: "Isaac", book: "Genesis", chapter: 17, testament: "OT", importance: "Abraham and Sarah's promised son, nearly sacrificed on Mount Moriah." },
  { name: "Rebekah", book: "Genesis", chapter: 22, testament: "OT", importance: "Isaac's wife, chosen at a well; mother of Jacob and Esau." },
  { name: "Esau", book: "Genesis", chapter: 25, testament: "OT", importance: "Isaac's elder son, who sells his birthright to his brother Jacob for stew." },
  { name: "Jacob", book: "Genesis", chapter: 25, testament: "OT", importance: "Isaac's younger son, later renamed Israel; father of the twelve tribes." },
  { name: "Laban", book: "Genesis", chapter: 24, testament: "OT", importance: "Rebekah's brother, and later Jacob's father-in-law and employer." },
  { name: "Leah", book: "Genesis", chapter: 29, testament: "OT", importance: "Jacob's first wife; mother of six tribes including Levi and Judah." },
  { name: "Rachel", book: "Genesis", chapter: 29, testament: "OT", importance: "Jacob's favored wife, mother of Joseph and Benjamin; dies in childbirth." },
  { name: "Reuben", book: "Genesis", chapter: 29, testament: "OT", importance: "Jacob's firstborn son; loses his birthright status after a moral failure." },
  { name: "Simeon", book: "Genesis", chapter: 29, testament: "OT", importance: "Jacob's second son; joins Levi in avenging their sister Dinah." },
  { name: "Levi", book: "Genesis", chapter: 29, testament: "OT", importance: "Jacob's third son; his descendants become Israel's priestly tribe." },
  { name: "Judah", book: "Genesis", chapter: 29, testament: "OT", importance: "Jacob's fourth son; his tribe produces David and, ultimately, Jesus." },
  { name: "Bilhah", book: "Genesis", chapter: 29, testament: "OT", importance: "Rachel's servant, mother of Dan and Naphtali through Jacob." },
  { name: "Zilpah", book: "Genesis", chapter: 29, testament: "OT", importance: "Leah's servant, mother of Gad and Asher through Jacob." },
  { name: "Joseph", book: "Genesis", chapter: 30, testament: "OT", importance: "Jacob's favored son, sold into slavery by his brothers, later rises to rule Egypt." },
  { name: "Dinah", book: "Genesis", chapter: 30, testament: "OT", importance: "Jacob's daughter, whose assault sparks a violent response from her brothers." },
  { name: "Benjamin", book: "Genesis", chapter: 35, testament: "OT", importance: "Jacob and Rachel's youngest son, born as Rachel dies." },
  { name: "Tamar (Judah's daughter-in-law)", book: "Genesis", chapter: 38, testament: "OT", importance: "Judah's daughter-in-law, who secures her rights through a bold deception." },
  { name: "Potiphar", book: "Genesis", chapter: 37, testament: "OT", importance: "Egyptian official who buys Joseph as a slave and later imprisons him." },
  { name: "Pharaoh (Joseph's Egypt)", book: "Genesis", chapter: 41, testament: "OT", importance: "Egyptian king who elevates Joseph to power after his dream interpretations." },

  // ---- Exodus ----
  { name: "Moses", book: "Exodus", chapter: 2, testament: "OT", importance: "Rescued as an infant from the Nile; leads Israel out of Egyptian slavery and receives the Law." },
  { name: "Miriam", book: "Exodus", chapter: 2, testament: "OT", importance: "Moses and Aaron's sister; a prophetess who leads Israel in worship after the Red Sea." },
  { name: "Zipporah", book: "Exodus", chapter: 2, testament: "OT", importance: "Moses' wife, daughter of the Midianite priest Jethro." },
  { name: "Pharaoh (Exodus)", book: "Exodus", chapter: 1, testament: "OT", importance: "The Egyptian king whose refusal to free Israel brings on the ten plagues." },
  { name: "Jethro", book: "Exodus", chapter: 3, testament: "OT", importance: "Moses' father-in-law, a Midianite priest who later advises him on leadership." },
  { name: "Aaron", book: "Exodus", chapter: 4, testament: "OT", importance: "Moses' older brother, who becomes Israel's first high priest." },
  { name: "Joshua", book: "Exodus", chapter: 17, testament: "OT", importance: "Moses' military commander and eventual successor as Israel's leader." },
  { name: "Bezalel", book: "Exodus", chapter: 31, testament: "OT", importance: "Chief craftsman gifted by God to build the tabernacle." },

  // ---- Leviticus ----
  { name: "Nadab and Abihu", book: "Leviticus", chapter: 10, testament: "OT", importance: "Aaron's sons, struck dead for offering 'unauthorized fire' before the Lord." },

  // ---- Numbers ----
  { name: "Caleb", book: "Numbers", chapter: 13, testament: "OT", importance: "One of the twelve spies; along with Joshua, believed Israel could take Canaan." },
  { name: "Korah", book: "Numbers", chapter: 16, testament: "OT", importance: "Levite who leads a rebellion against Moses and is swallowed by the earth." },
  { name: "Balak", book: "Numbers", chapter: 22, testament: "OT", importance: "Moabite king who hires the prophet Balaam to curse Israel." },
  { name: "Balaam", book: "Numbers", chapter: 22, testament: "OT", importance: "A foreign prophet hired to curse Israel who blesses them instead; his donkey speaks." },
  { name: "Phinehas", book: "Numbers", chapter: 25, testament: "OT", importance: "Aaron's grandson, whose zealous action halts a plague on Israel." },

  // ---- Joshua ----
  { name: "Rahab", book: "Joshua", chapter: 2, testament: "OT", importance: "Jericho prostitute who hides Israelite spies and is spared when the city falls." },
  { name: "Achan", book: "Joshua", chapter: 7, testament: "OT", importance: "Israelite whose theft of forbidden plunder brings defeat at Ai." },

  // ---- Judges ----
  { name: "Deborah", book: "Judges", chapter: 4, testament: "OT", importance: "Prophetess and judge who leads Israel to victory over Canaanite forces." },
  { name: "Barak", book: "Judges", chapter: 4, testament: "OT", importance: "Israelite commander who defeats Sisera's army at Deborah's urging." },
  { name: "Jael", book: "Judges", chapter: 4, testament: "OT", importance: "Kenite woman who kills the fleeing enemy general Sisera." },
  { name: "Gideon", book: "Judges", chapter: 6, testament: "OT", importance: "Reluctant judge who defeats a massive Midianite army with just 300 men." },
  { name: "Abimelech (Gideon's son)", book: "Judges", chapter: 9, testament: "OT", importance: "Gideon's son who murders his brothers to seize power over Israel." },
  { name: "Jephthah", book: "Judges", chapter: 11, testament: "OT", importance: "Judge who defeats the Ammonites but makes a tragic, rash vow." },
  { name: "Samson", book: "Judges", chapter: 13, testament: "OT", importance: "Judge with supernatural strength, betrayed by Delilah after his Nazirite vow is broken." },
  { name: "Delilah", book: "Judges", chapter: 16, testament: "OT", importance: "Woman who betrays Samson's secret strength to the Philistines." },

  // ---- Ruth ----
  { name: "Naomi", book: "Ruth", chapter: 1, testament: "OT", importance: "Widow who returns to Bethlehem from Moab with her loyal daughter-in-law Ruth." },
  { name: "Ruth", book: "Ruth", chapter: 1, testament: "OT", importance: "Moabite widow whose loyalty to Naomi leads her to become David's great-grandmother." },
  { name: "Boaz", book: "Ruth", chapter: 2, testament: "OT", importance: "Wealthy relative of Naomi who marries Ruth as her kinsman-redeemer." },

  // ---- 1 Samuel ----
  { name: "Hannah", book: "1 Samuel", chapter: 1, testament: "OT", importance: "Samuel's mother, whose prayer for a child models heartfelt devotion." },
  { name: "Eli", book: "1 Samuel", chapter: 1, testament: "OT", importance: "Priest and judge who raises Samuel at the tabernacle in Shiloh." },
  { name: "Samuel", book: "1 Samuel", chapter: 1, testament: "OT", importance: "Last judge and first great prophet of Israel; anoints both Saul and David as king." },
  { name: "Saul", book: "1 Samuel", chapter: 9, testament: "OT", importance: "Israel's first king, later rejected by God and consumed by jealousy of David." },
  { name: "Jonathan", book: "1 Samuel", chapter: 13, testament: "OT", importance: "Saul's son, whose deep friendship with David crosses political lines." },
  { name: "David", book: "1 Samuel", chapter: 16, testament: "OT", importance: "Shepherd anointed as king who becomes Israel's greatest ruler and ancestor of Jesus." },
  { name: "Goliath", book: "1 Samuel", chapter: 17, testament: "OT", importance: "Philistine giant famously defeated by the young David." },
  { name: "Abigail", book: "1 Samuel", chapter: 25, testament: "OT", importance: "Wise woman who prevents David from taking violent revenge; later becomes his wife." },

  // ---- 2 Samuel ----
  { name: "Joab", book: "2 Samuel", chapter: 2, testament: "OT", importance: "David's ruthless military commander and nephew." },
  { name: "Absalom", book: "2 Samuel", chapter: 3, testament: "OT", importance: "David's son who leads a rebellion against his father and dies in defeat." },
  { name: "Nathan", book: "2 Samuel", chapter: 7, testament: "OT", importance: "Prophet who confronts David over Bathsheba and delivers the Davidic covenant." },
  { name: "Bathsheba", book: "2 Samuel", chapter: 11, testament: "OT", importance: "Woman David commits adultery with; later mother of Solomon." },

  // ---- 1 Kings ----
  { name: "Solomon", book: "1 Kings", chapter: 1, testament: "OT", importance: "David's son, famed for wisdom, wealth, and building the Jerusalem Temple." },
  { name: "Ahab", book: "1 Kings", chapter: 16, testament: "OT", importance: "Wicked king of Israel married to Jezebel, frequently opposed by Elijah." },
  { name: "Jezebel", book: "1 Kings", chapter: 16, testament: "OT", importance: "Ahab's pagan queen who promotes Baal worship and persecutes God's prophets." },
  { name: "Elijah", book: "1 Kings", chapter: 17, testament: "OT", importance: "Fiery prophet who confronts Baal worship and is taken up to heaven in a whirlwind." },
  { name: "Queen of Sheba", book: "1 Kings", chapter: 10, testament: "OT", importance: "Foreign queen who visits Solomon to test his renowned wisdom." },
  { name: "Rehoboam", book: "1 Kings", chapter: 11, testament: "OT", importance: "Solomon's son whose harsh rule splits the kingdom in two." },
  { name: "Jeroboam", book: "1 Kings", chapter: 11, testament: "OT", importance: "First king of the northern kingdom of Israel after the split." },

  // ---- 2 Kings ----
  { name: "Elisha", book: "2 Kings", chapter: 2, testament: "OT", importance: "Elijah's successor, who performs many miracles, including healing Naaman." },
  { name: "Naaman", book: "2 Kings", chapter: 5, testament: "OT", importance: "Aramean army commander healed of leprosy after washing in the Jordan." },
  { name: "Jehu", book: "2 Kings", chapter: 9, testament: "OT", importance: "Israelite king anointed to violently end the house of Ahab." },
  { name: "Hezekiah", book: "2 Kings", chapter: 18, testament: "OT", importance: "Reforming king of Judah who trusts God during an Assyrian siege." },
  { name: "Josiah", book: "2 Kings", chapter: 22, testament: "OT", importance: "Boy king who leads Judah's last great religious reform." },

  // ---- Ezra / Nehemiah / Esther ----
  { name: "Zerubbabel", book: "Ezra", chapter: 2, testament: "OT", importance: "Leader of the first group of exiles who return to rebuild the Temple." },
  { name: "Ezra", book: "Ezra", chapter: 7, testament: "OT", importance: "Priest and scribe who leads spiritual reform after the Babylonian exile." },
  { name: "Nehemiah", book: "Nehemiah", chapter: 1, testament: "OT", importance: "Cupbearer to the Persian king who leads the rebuilding of Jerusalem's walls." },
  { name: "Sanballat", book: "Nehemiah", chapter: 2, testament: "OT", importance: "Opponent who repeatedly tries to stop Nehemiah's wall-building project." },
  { name: "Ahasuerus (Xerxes)", book: "Esther", chapter: 1, testament: "OT", importance: "Persian king whose search for a new queen leads to Esther's rise." },
  { name: "Vashti", book: "Esther", chapter: 1, testament: "OT", importance: "Persian queen deposed for refusing the king's summons." },
  { name: "Esther", book: "Esther", chapter: 2, testament: "OT", importance: "Jewish queen of Persia who risks her life to save her people from genocide." },
  { name: "Mordecai", book: "Esther", chapter: 2, testament: "OT", importance: "Esther's cousin and guardian, who uncovers a plot and refuses to bow to Haman." },
  { name: "Haman", book: "Esther", chapter: 3, testament: "OT", importance: "Persian official whose plot to destroy the Jews backfires and leads to his own death." },

  // ---- Job ----
  { name: "Job", book: "Job", chapter: 1, testament: "OT", importance: "Righteous man who endures immense suffering while wrestling with its meaning." },
  { name: "Eliphaz, Bildad, and Zophar", book: "Job", chapter: 2, testament: "OT", importance: "Job's three friends, whose speeches try to explain his suffering as deserved punishment." },
  { name: "Elihu", book: "Job", chapter: 32, testament: "OT", importance: "Younger man who speaks last among Job's companions, defending God's justice." },

  // ---- Isaiah / Jeremiah / Ezekiel / Daniel / minor prophets ----
  { name: "Isaiah", book: "Isaiah", chapter: 1, testament: "OT", importance: "Major prophet whose visions include the coming Messiah and Suffering Servant." },
  { name: "Cyrus", book: "Isaiah", chapter: 44, testament: "OT", importance: "Persian king named in advance as God's instrument to free the exiles." },
  { name: "Jeremiah", book: "Jeremiah", chapter: 1, testament: "OT", importance: "The 'weeping prophet' who warns Judah of coming judgment despite fierce opposition." },
  { name: "Baruch", book: "Jeremiah", chapter: 32, testament: "OT", importance: "Jeremiah's faithful scribe, who records and reads his prophecies." },
  { name: "Ezekiel", book: "Ezekiel", chapter: 1, testament: "OT", importance: "Exiled priest-prophet known for vivid visions, including the valley of dry bones." },
  { name: "Daniel", book: "Daniel", chapter: 1, testament: "OT", importance: "Exiled Judean who rises to high office in Babylon and Persia through faithfulness." },
  { name: "Shadrach, Meshach, and Abednego", book: "Daniel", chapter: 1, testament: "OT", importance: "Daniel's three friends, thrown into a fiery furnace for refusing to worship an idol." },
  { name: "Nebuchadnezzar", book: "Daniel", chapter: 1, testament: "OT", importance: "Babylonian king whose dreams Daniel interprets; later humbled by God." },
  { name: "Belshazzar", book: "Daniel", chapter: 5, testament: "OT", importance: "Babylonian king who sees the writing on the wall the night his kingdom falls." },
  { name: "Darius the Mede", book: "Daniel", chapter: 6, testament: "OT", importance: "King tricked into casting Daniel into the lions' den." },
  { name: "Hosea", book: "Hosea", chapter: 1, testament: "OT", importance: "Prophet whose troubled marriage to Gomer becomes a picture of God's love for unfaithful Israel." },
  { name: "Gomer", book: "Hosea", chapter: 1, testament: "OT", importance: "Hosea's unfaithful wife, symbolizing Israel's spiritual adultery." },
  { name: "Jonah", book: "Jonah", chapter: 1, testament: "OT", importance: "Reluctant prophet swallowed by a great fish after fleeing his call to Nineveh." },

  // ---- Matthew ----
  { name: "Mary (mother of Jesus)", book: "Matthew", chapter: 1, testament: "NT", importance: "Jesus' mother, a young woman chosen to bear the Messiah." },
  { name: "Joseph (husband of Mary)", book: "Matthew", chapter: 1, testament: "NT", importance: "Mary's husband, a carpenter who obediently raises Jesus as his own son." },
  { name: "Jesus", book: "Matthew", chapter: 1, testament: "NT", importance: "The central figure of the New Testament, believed to be the Son of God and Messiah." },
  { name: "Herod the Great", book: "Matthew", chapter: 2, testament: "NT", importance: "Roman-appointed king of Judea who orders the massacre of infants in Bethlehem." },
  { name: "John the Baptist", book: "Matthew", chapter: 3, testament: "NT", importance: "Prophet who prepares the way for Jesus and baptizes him in the Jordan." },
  { name: "Peter (Simon)", book: "Matthew", chapter: 4, testament: "NT", importance: "Leading apostle and fisherman; later becomes a foundational leader of the early church." },
  { name: "Andrew", book: "Matthew", chapter: 4, testament: "NT", importance: "Peter's brother and fellow fisherman, one of the first disciples called." },
  { name: "James son of Zebedee", book: "Matthew", chapter: 4, testament: "NT", importance: "Apostle and brother of John; part of Jesus' inner circle of three." },
  { name: "John (the Apostle)", book: "Matthew", chapter: 4, testament: "NT", importance: "Apostle, brother of James; traditionally author of the Fourth Gospel and Revelation." },
  { name: "Matthew (Levi)", book: "Matthew", chapter: 9, testament: "NT", importance: "Tax collector called by Jesus to become an apostle; traditional author of this Gospel." },
  { name: "Judas Iscariot", book: "Matthew", chapter: 10, testament: "NT", importance: "Apostle who betrays Jesus to the religious authorities for silver." },
  { name: "Caiaphas", book: "Matthew", chapter: 26, testament: "NT", importance: "High priest who presides over Jesus' trial before the Sanhedrin." },
  { name: "Pontius Pilate", book: "Matthew", chapter: 27, testament: "NT", importance: "Roman governor who authorizes Jesus' crucifixion despite finding no guilt in him." },
  { name: "Mary Magdalene", book: "Matthew", chapter: 27, testament: "NT", importance: "Devoted follower of Jesus, and first witness of his resurrection." },
  { name: "Barabbas", book: "Matthew", chapter: 27, testament: "NT", importance: "Convicted insurrectionist released instead of Jesus at the crowd's demand." },

  // ---- John (figures introduced there first) ----
  { name: "Nathanael (Bartholomew)", book: "John", chapter: 1, testament: "NT", importance: "Apostle introduced skeptically ('can anything good come from Nazareth?') who becomes a devoted follower." },
  { name: "Philip (Apostle)", book: "John", chapter: 1, testament: "NT", importance: "Apostle who brings Nathanael to Jesus and later asks to see the Father." },
  { name: "Nicodemus", book: "John", chapter: 3, testament: "NT", importance: "Pharisee who visits Jesus at night and later helps bury him." },
  { name: "Thomas", book: "John", chapter: 11, testament: "NT", importance: "Apostle remembered for doubting the resurrection until he sees Jesus' wounds himself." },
  { name: "Lazarus", book: "John", chapter: 11, testament: "NT", importance: "Jesus' friend, raised from the dead after four days in the tomb." },
  { name: "Martha", book: "John", chapter: 11, testament: "NT", importance: "Lazarus' sister, known for her practical service and confession of faith." },
  { name: "Mary of Bethany", book: "John", chapter: 11, testament: "NT", importance: "Lazarus' sister who anoints Jesus' feet with expensive perfume." },

  // ---- Luke ----
  { name: "Zechariah (priest)", book: "Luke", chapter: 1, testament: "NT", importance: "Elderly priest who doubts an angel's announcement and is struck mute until his son's birth." },
  { name: "Elizabeth", book: "Luke", chapter: 1, testament: "NT", importance: "Mary's relative and John the Baptist's mother, previously unable to conceive." },
  { name: "Simeon (temple)", book: "Luke", chapter: 2, testament: "NT", importance: "Devout elder promised he would see the Messiah before he died." },
  { name: "Anna (prophetess)", book: "Luke", chapter: 2, testament: "NT", importance: "Elderly prophetess who recognizes the infant Jesus as the promised redeemer." },
  { name: "Herod Antipas", book: "Luke", chapter: 3, testament: "NT", importance: "Ruler of Galilee who executes John the Baptist and later mocks Jesus before his crucifixion." },
  { name: "Zacchaeus", book: "Luke", chapter: 19, testament: "NT", importance: "Wealthy, short tax collector who climbs a tree to see Jesus and repents." },

  // ---- Acts ----
  { name: "Matthias", book: "Acts", chapter: 1, testament: "NT", importance: "Chosen by lot to replace Judas Iscariot among the twelve apostles." },
  { name: "Barnabas", book: "Acts", chapter: 4, testament: "NT", importance: "Encourager who vouches for Paul and partners with him on missionary journeys." },
  { name: "Stephen", book: "Acts", chapter: 6, testament: "NT", importance: "First Christian martyr, stoned to death after a bold speech before the Sanhedrin." },
  { name: "Philip the Evangelist", book: "Acts", chapter: 6, testament: "NT", importance: "One of the first deacons; shares the gospel with an Ethiopian official." },
  { name: "Saul (Paul)", book: "Acts", chapter: 7, testament: "NT", importance: "Zealous persecutor of the church transformed into its greatest missionary." },
  { name: "Ananias of Damascus", book: "Acts", chapter: 9, testament: "NT", importance: "Disciple who prays for Saul's healing and baptizes him after his conversion." },
  { name: "Cornelius", book: "Acts", chapter: 10, testament: "NT", importance: "Roman centurion whose conversion marks the gospel's spread to Gentiles." },
  { name: "Herod Agrippa I", book: "Acts", chapter: 12, testament: "NT", importance: "King who persecutes the church and executes the apostle James." },
  { name: "Silas", book: "Acts", chapter: 15, testament: "NT", importance: "Paul's missionary companion, imprisoned with him in Philippi." },
  { name: "Timothy", book: "Acts", chapter: 16, testament: "NT", importance: "Young disciple who becomes Paul's close companion and recipient of two epistles." },
  { name: "Lydia", book: "Acts", chapter: 16, testament: "NT", importance: "Wealthy merchant in Philippi and one of Paul's first European converts." },
  { name: "Priscilla and Aquila", book: "Acts", chapter: 18, testament: "NT", importance: "Missionary couple who partner with Paul and mentor Apollos." },
  { name: "Apollos", book: "Acts", chapter: 18, testament: "NT", importance: "Eloquent Alexandrian teacher who strengthens the early church." },
  { name: "Herod Agrippa II", book: "Acts", chapter: 25, testament: "NT", importance: "King before whom Paul makes his defense, saying he was 'almost persuaded.'" },

  // ---- Epistles ----
  { name: "Phoebe", book: "Romans", chapter: 16, testament: "NT", importance: "Deaconess entrusted with carrying Paul's letter to the Roman church." },
  { name: "Titus", book: "2 Corinthians", chapter: 2, testament: "NT", importance: "Paul's trusted companion, later sent to organize the church in Crete." },
  { name: "Onesimus", book: "Philemon", chapter: 1, testament: "NT", importance: "Runaway slave who becomes a believer and returns to Philemon as a brother in Christ." },
  { name: "Philemon", book: "Philemon", chapter: 1, testament: "NT", importance: "Wealthy Christian asked by Paul to forgive and welcome back his runaway slave Onesimus." },

  // ---- Revelation ----
  { name: "John of Patmos", book: "Revelation", chapter: 1, testament: "NT", importance: "Exiled apostle who receives the apocalyptic visions recorded in Revelation." },
];
