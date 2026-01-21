/**
 * Complete Italian Provinces and Cities Dataset
 * 
 * This file contains a complete list of all 107 Italian provinces with their codes,
 * and a comprehensive list of cities organized by province.
 * 
 * Data source: ISTAT (Italian National Institute of Statistics)
 */

/**
 * All Italian provinces with their codes, names, and region
 * Format: { code, name, region, regionId }
 */
export const ITALIAN_PROVINCES = [
  // Abruzzo
  { code: 'AQ', name: "L'Aquila", region: 'Abruzzo', regionId: 1679 },
  { code: 'CH', name: 'Chieti', region: 'Abruzzo', regionId: 1679 },
  { code: 'PE', name: 'Pescara', region: 'Abruzzo', regionId: 1679 },
  { code: 'TE', name: 'Teramo', region: 'Abruzzo', regionId: 1679 },
  
  // Basilicata
  { code: 'MT', name: 'Matera', region: 'Basilicata', regionId: 1706 },
  { code: 'PZ', name: 'Potenza', region: 'Basilicata', regionId: 1706 },
  
  // Calabria
  { code: 'CS', name: 'Cosenza', region: 'Calabria', regionId: 1703 },
  { code: 'CZ', name: 'Catanzaro', region: 'Calabria', regionId: 1703 },
  { code: 'KR', name: 'Crotone', region: 'Calabria', regionId: 1703 },
  { code: 'RC', name: 'Reggio Calabria', region: 'Calabria', regionId: 1703 },
  { code: 'VV', name: 'Vibo Valentia', region: 'Calabria', regionId: 1703 },
  
  // Campania
  { code: 'AV', name: 'Avellino', region: 'Campania', regionId: 1669 },
  { code: 'BN', name: 'Benevento', region: 'Campania', regionId: 1669 },
  { code: 'CE', name: 'Caserta', region: 'Campania', regionId: 1669 },
  { code: 'NA', name: 'Napoli', region: 'Campania', regionId: 1669 },
  { code: 'SA', name: 'Salerno', region: 'Campania', regionId: 1669 },
  
  // Emilia-Romagna
  { code: 'BO', name: 'Bologna', region: 'Emilia-Romagna', regionId: 1773 },
  { code: 'FC', name: 'Forlì-Cesena', region: 'Emilia-Romagna', regionId: 1773 },
  { code: 'FE', name: 'Ferrara', region: 'Emilia-Romagna', regionId: 1773 },
  { code: 'MO', name: 'Modena', region: 'Emilia-Romagna', regionId: 1773 },
  { code: 'PR', name: 'Parma', region: 'Emilia-Romagna', regionId: 1773 },
  { code: 'PC', name: 'Piacenza', region: 'Emilia-Romagna', regionId: 1773 },
  { code: 'RA', name: 'Ravenna', region: 'Emilia-Romagna', regionId: 1773 },
  { code: 'RE', name: 'Reggio Emilia', region: 'Emilia-Romagna', regionId: 1773 },
  { code: 'RN', name: 'Rimini', region: 'Emilia-Romagna', regionId: 1773 },
  
  // Friuli-Venezia Giulia
  { code: 'GO', name: 'Gorizia', region: 'Friuli-Venezia Giulia', regionId: 1756 },
  { code: 'PN', name: 'Pordenone', region: 'Friuli-Venezia Giulia', regionId: 1756 },
  { code: 'TS', name: 'Trieste', region: 'Friuli-Venezia Giulia', regionId: 1756 },
  { code: 'UD', name: 'Udine', region: 'Friuli-Venezia Giulia', regionId: 1756 },
  
  // Lazio
  { code: 'FR', name: 'Frosinone', region: 'Lazio', regionId: 1678 },
  { code: 'LT', name: 'Latina', region: 'Lazio', regionId: 1678 },
  { code: 'RI', name: 'Rieti', region: 'Lazio', regionId: 1678 },
  { code: 'RM', name: 'Roma', region: 'Lazio', regionId: 1678 },
  { code: 'VT', name: 'Viterbo', region: 'Lazio', regionId: 1678 },
  
  // Liguria
  { code: 'GE', name: 'Genova', region: 'Liguria', regionId: 1768 },
  { code: 'IM', name: 'Imperia', region: 'Liguria', regionId: 1768 },
  { code: 'SP', name: 'La Spezia', region: 'Liguria', regionId: 1768 },
  { code: 'SV', name: 'Savona', region: 'Liguria', regionId: 1768 },
  
  // Lombardia
  { code: 'BG', name: 'Bergamo', region: 'Lombardia', regionId: 1705 },
  { code: 'BS', name: 'Brescia', region: 'Lombardia', regionId: 1705 },
  { code: 'CO', name: 'Como', region: 'Lombardia', regionId: 1705 },
  { code: 'CR', name: 'Cremona', region: 'Lombardia', regionId: 1705 },
  { code: 'LC', name: 'Lecco', region: 'Lombardia', regionId: 1705 },
  { code: 'LO', name: 'Lodi', region: 'Lombardia', regionId: 1705 },
  { code: 'MB', name: 'Monza e Brianza', region: 'Lombardia', regionId: 1705 },
  { code: 'MI', name: 'Milano', region: 'Lombardia', regionId: 1705 },
  { code: 'MN', name: 'Mantova', region: 'Lombardia', regionId: 1705 },
  { code: 'PV', name: 'Pavia', region: 'Lombardia', regionId: 1705 },
  { code: 'SO', name: 'Sondrio', region: 'Lombardia', regionId: 1705 },
  { code: 'VA', name: 'Varese', region: 'Lombardia', regionId: 1705 },
  
  // Marche
  { code: 'AN', name: 'Ancona', region: 'Marche', regionId: 1670 },
  { code: 'AP', name: 'Ascoli Piceno', region: 'Marche', regionId: 1670 },
  { code: 'FM', name: 'Fermo', region: 'Marche', regionId: 1670 },
  { code: 'MC', name: 'Macerata', region: 'Marche', regionId: 1670 },
  { code: 'PU', name: 'Pesaro e Urbino', region: 'Marche', regionId: 1670 },
  
  // Molise
  { code: 'CB', name: 'Campobasso', region: 'Molise', regionId: 1695 },
  { code: 'IS', name: 'Isernia', region: 'Molise', regionId: 1695 },
  
  // Piemonte
  { code: 'AL', name: 'Alessandria', region: 'Piemonte', regionId: 1702 },
  { code: 'AT', name: 'Asti', region: 'Piemonte', regionId: 1702 },
  { code: 'BI', name: 'Biella', region: 'Piemonte', regionId: 1702 },
  { code: 'CN', name: 'Cuneo', region: 'Piemonte', regionId: 1702 },
  { code: 'NO', name: 'Novara', region: 'Piemonte', regionId: 1702 },
  { code: 'TO', name: 'Torino', region: 'Piemonte', regionId: 1702 },
  { code: 'VB', name: 'Verbano-Cusio-Ossola', region: 'Piemonte', regionId: 1702 },
  { code: 'VC', name: 'Vercelli', region: 'Piemonte', regionId: 1702 },
  
  // Puglia
  { code: 'BA', name: 'Bari', region: 'Puglia', regionId: 1688 },
  { code: 'BR', name: 'Brindisi', region: 'Puglia', regionId: 1688 },
  { code: 'BT', name: 'Barletta-Andria-Trani', region: 'Puglia', regionId: 1688 },
  { code: 'FG', name: 'Foggia', region: 'Puglia', regionId: 1688 },
  { code: 'LE', name: 'Lecce', region: 'Puglia', regionId: 1688 },
  { code: 'TA', name: 'Taranto', region: 'Puglia', regionId: 1688 },
  
  // Sardegna
  { code: 'CA', name: 'Cagliari', region: 'Sardegna', regionId: 1715 },
  { code: 'NU', name: 'Nuoro', region: 'Sardegna', regionId: 1715 },
  { code: 'OR', name: 'Oristano', region: 'Sardegna', regionId: 1715 },
  { code: 'SS', name: 'Sassari', region: 'Sardegna', regionId: 1715 },
  { code: 'SU', name: 'Sud Sardegna', region: 'Sardegna', regionId: 1715 },
  
  // Sicilia
  { code: 'AG', name: 'Agrigento', region: 'Sicilia', regionId: 1709 },
  { code: 'CL', name: 'Caltanissetta', region: 'Sicilia', regionId: 1709 },
  { code: 'CT', name: 'Catania', region: 'Sicilia', regionId: 1709 },
  { code: 'EN', name: 'Enna', region: 'Sicilia', regionId: 1709 },
  { code: 'ME', name: 'Messina', region: 'Sicilia', regionId: 1709 },
  { code: 'PA', name: 'Palermo', region: 'Sicilia', regionId: 1709 },
  { code: 'RG', name: 'Ragusa', region: 'Sicilia', regionId: 1709 },
  { code: 'SR', name: 'Siracusa', region: 'Sicilia', regionId: 1709 },
  { code: 'TP', name: 'Trapani', region: 'Sicilia', regionId: 1709 },
  
  // Toscana
  { code: 'AR', name: 'Arezzo', region: 'Toscana', regionId: 1664 },
  { code: 'FI', name: 'Firenze', region: 'Toscana', regionId: 1664 },
  { code: 'GR', name: 'Grosseto', region: 'Toscana', regionId: 1664 },
  { code: 'LI', name: 'Livorno', region: 'Toscana', regionId: 1664 },
  { code: 'LU', name: 'Lucca', region: 'Toscana', regionId: 1664 },
  { code: 'MS', name: 'Massa-Carrara', region: 'Toscana', regionId: 1664 },
  { code: 'PI', name: 'Pisa', region: 'Toscana', regionId: 1664 },
  { code: 'PO', name: 'Prato', region: 'Toscana', regionId: 1664 },
  { code: 'PT', name: 'Pistoia', region: 'Toscana', regionId: 1664 },
  { code: 'SI', name: 'Siena', region: 'Toscana', regionId: 1664 },
  
  // Trentino-Alto Adige
  { code: 'BZ', name: 'Bolzano', region: 'Trentino-Alto Adige', regionId: 1725 },
  { code: 'TN', name: 'Trento', region: 'Trentino-Alto Adige', regionId: 1725 },
  
  // Umbria
  { code: 'PG', name: 'Perugia', region: 'Umbria', regionId: 1683 },
  { code: 'TR', name: 'Terni', region: 'Umbria', regionId: 1683 },
  
  // Valle d'Aosta
  { code: 'AO', name: 'Aosta', region: "Valle d'Aosta", regionId: 1716 },
  
  // Veneto
  { code: 'BL', name: 'Belluno', region: 'Veneto', regionId: 1753 },
  { code: 'PD', name: 'Padova', region: 'Veneto', regionId: 1753 },
  { code: 'RO', name: 'Rovigo', region: 'Veneto', regionId: 1753 },
  { code: 'TV', name: 'Treviso', region: 'Veneto', regionId: 1753 },
  { code: 'VE', name: 'Venezia', region: 'Veneto', regionId: 1753 },
  { code: 'VI', name: 'Vicenza', region: 'Veneto', regionId: 1753 },
  { code: 'VR', name: 'Verona', region: 'Veneto', regionId: 1753 },
];

/**
 * Italian cities organized by province code
 * Each province includes its main cities (comuni)
 * This is a subset of the most populated cities per province
 */
export const ITALIAN_CITIES_BY_PROVINCE = {
  // Lombardia
  MI: [
    'Milano', 'Sesto San Giovanni', 'Cinisello Balsamo', 'Legnano', 'Rho', 'Paderno Dugnano',
    'Cologno Monzese', 'Corsico', 'Rozzano', 'San Donato Milanese', 'San Giuliano Milanese',
    'Segrate', 'Pioltello', 'Opera', 'Cernusco sul Naviglio', 'Bollate', 'Abbiategrasso',
    'Magenta', 'Garbagnate Milanese', 'Buccinasco', 'Cesano Boscone', 'Arese', 'Bresso',
    'Peschiera Borromeo', 'Trezzano sul Naviglio', 'Lainate', 'Corbetta', 'Melzo',
    'Cassano d\'Adda', 'Parabiago', 'Senago', 'Bareggio', 'Baranzate', 'Cormano',
    'Nerviano', 'Vimodrone', 'Pero', 'Novate Milanese', 'Settimo Milanese', 'Cusano Milanino',
    'Paullo', 'San Colombano al Lambro', 'Locate di Triulzi', 'Mediglia', 'Basiglio',
    'Assago', 'Solaro', 'Cerro Maggiore', 'Rescaldina', 'Vittuone', 'Limbiate', 'Desio',
  ],
  MB: [
    'Monza', 'Seregno', 'Desio', 'Cesano Maderno', 'Limbiate', 'Lissone', 'Brugherio',
    'Muggiò', 'Nova Milanese', 'Giussano', 'Carate Brianza', 'Vimercate', 'Meda',
    'Varedo', 'Seveso', 'Arcore', 'Villasanta', 'Bovisio-Masciago', 'Besana in Brianza',
    'Lentate sul Seveso', 'Ornago', 'Agrate Brianza', 'Biassono', 'Concorezzo',
  ],
  BG: [
    'Bergamo', 'Treviglio', 'Seriate', 'Dalmine', 'Romano di Lombardia', 'Albino',
    'Caravaggio', 'Zogno', 'Scanzorosciate', 'Curno', 'Stezzano', 'Alzano Lombardo',
    'Ponte San Pietro', 'Osio Sotto', 'Clusone', 'Verdello', 'Grumello del Monte',
    'Nembro', 'Grassobbio', 'Calcinate', 'Torre Boldone', 'Ciserano', 'Bonate Sotto',
    'Lovere', 'Urgnano', 'Sarnico', 'Gandino', 'Costa Volpino', 'Castelli Calepio',
  ],
  BS: [
    'Brescia', 'Desenzano del Garda', 'Montichiari', 'Lumezzane', 'Palazzolo sull\'Oglio',
    'Chiari', 'Ghedi', 'Rovato', 'Concesio', 'Iseo', 'Orzinuovi', 'Gardone Val Trompia',
    'Bagnolo Mella', 'Leno', 'Sarezzo', 'Gussago', 'Manerbio', 'Darfo Boario Terme',
    'Lonato del Garda', 'Salò', 'Rezzato', 'Calcinato', 'Nave', 'Villa Carcina',
    'Travagliato', 'Castenedolo', 'Borgosatollo', 'Carpenedolo', 'Breno', 'Bedizzole',
  ],
  CO: [
    'Como', 'Cantù', 'Mariano Comense', 'Erba', 'Olgiate Comasco', 'Turate', 'Fino Mornasco',
    'Appiano Gentile', 'Lomazzo', 'Inverigo', 'Lurate Caccivio', 'Cermenate', 'Mozzate',
    'Cabiate', 'Cadorago', 'Lipomo', 'San Fermo della Battaglia', 'Grandate', 'Casnate con Bernate',
  ],
  CR: [
    'Cremona', 'Crema', 'Casalmaggiore', 'Castelleone', 'Soresina', 'Pandino', 'Rivolta d\'Adda',
    'Spino d\'Adda', 'Pizzighettone', 'Casalbuttano ed Uniti', 'Soncino', 'Offanengo',
  ],
  LC: [
    'Lecco', 'Merate', 'Calolziocorte', 'Casatenovo', 'Valmadrera', 'Oggiono', 'Olginate',
    'Missaglia', 'Nibionno', 'Bosisio Parini', 'Costa Masnaga', 'Galbiate', 'Mandello del Lario',
  ],
  LO: [
    'Lodi', 'Codogno', 'Casalpusterlengo', 'Sant\'Angelo Lodigiano', 'Castiglione d\'Adda',
    'Zelo Buon Persico', 'Tavazzano con Villavesco', 'San Martino in Strada', 'Borghetto Lodigiano',
  ],
  MN: [
    'Mantova', 'Castiglione delle Stiviere', 'Suzzara', 'Viadana', 'Porto Mantovano',
    'Curtatone', 'Goito', 'Asola', 'Gonzaga', 'Castel Goffredo', 'Medole', 'Pegognaga',
    'San Giorgio Bigarello', 'Villimpenta', 'Quistello', 'Marmirolo', 'Ostiglia',
  ],
  PV: [
    'Pavia', 'Vigevano', 'Voghera', 'Mortara', 'Stradella', 'Broni', 'Cassolnovo',
    'Gambolò', 'Garlasco', 'Belgioioso', 'Robbio', 'Mede', 'Cilavegna', 'Cava Manara',
  ],
  SO: [
    'Sondrio', 'Morbegno', 'Tirano', 'Chiavenna', 'Livigno', 'Bormio', 'Teglio',
    'Aprica', 'Madesimo', 'Chiesa in Valmalenco', 'Valdidentro', 'Ponte in Valtellina',
  ],
  VA: [
    'Varese', 'Busto Arsizio', 'Gallarate', 'Saronno', 'Castellanza', 'Legnano', 'Tradate',
    'Somma Lombardo', 'Luino', 'Laveno-Mombello', 'Gavirate', 'Sesto Calende', 'Cardano al Campo',
    'Cassano Magnago', 'Caronno Pertusella', 'Malnate', 'Solbiate Olona', 'Origgio', 'Gorla Maggiore',
  ],

  // Lazio
  RM: [
    'Roma', 'Guidonia Montecelio', 'Fiumicino', 'Pomezia', 'Tivoli', 'Velletri', 'Anzio',
    'Nettuno', 'Ardea', 'Civitavecchia', 'Marino', 'Aprilia', 'Ciampino', 'Ladispoli',
    'Albano Laziale', 'Genzano di Roma', 'Fonte Nuova', 'Monterotondo', 'Mentana', 'Frascati',
    'Colleferro', 'Ariccia', 'Palestrina', 'Cerveteri', 'Bracciano', 'Zagarolo', 'Lanuvio',
    'Rocca di Papa', 'Santa Marinella', 'Artena', 'Valmontone', 'Rocca Priora', 'Grottaferrata',
    'Palombara Sabina', 'Castel Gandolfo', 'Campagnano di Roma', 'Riano', 'Sacrofano',
  ],
  FR: [
    'Frosinone', 'Cassino', 'Alatri', 'Sora', 'Ceccano', 'Veroli', 'Ferentino', 'Anagni',
    'Fiuggi', 'Pontecorvo', 'Monte San Giovanni Campano', 'Isola del Liri', 'Piedimonte San Germano',
  ],
  LT: [
    'Latina', 'Aprilia', 'Terracina', 'Formia', 'Fondi', 'Gaeta', 'Cisterna di Latina',
    'Sabaudia', 'Minturno', 'Sezze', 'Priverno', 'Pontinia', 'Itri', 'Cori',
  ],
  RI: [
    'Rieti', 'Fara in Sabina', 'Cittaducale', 'Poggio Mirteto', 'Magliano Sabina',
    'Montopoli in Sabina', 'Contigliano', 'Stimigliano',
  ],
  VT: [
    'Viterbo', 'Civita Castellana', 'Tarquinia', 'Montalto di Castro', 'Vetralla',
    'Orte', 'Montefiascone', 'Ronciglione', 'Nepi', 'Sutri', 'Capranica', 'Bolsena',
  ],

  // Piemonte
  TO: [
    'Torino', 'Moncalieri', 'Collegno', 'Rivoli', 'Nichelino', 'Settimo Torinese', 'Grugliasco',
    'Chieri', 'Pinerolo', 'Venaria Reale', 'Carmagnola', 'Chivasso', 'Orbassano', 'Beinasco',
    'San Mauro Torinese', 'Ivrea', 'Rivarolo Canavese', 'Leinì', 'Alpignano', 'Trofarello',
    'Vinovo', 'Giaveno', 'Caselle Torinese', 'Pianezza', 'Borgaro Torinese', 'Volpiano',
    'Ciriè', 'Avigliana', 'Druento', 'La Loggia', 'Bruino', 'Piossasco', 'None',
    'Santena', 'Poirino', 'Buttigliera Alta', 'San Giorgio Canavese', 'Carignano',
  ],
  AL: [
    'Alessandria', 'Casale Monferrato', 'Novi Ligure', 'Tortona', 'Acqui Terme', 'Ovada',
    'Valenza', 'Serravalle Scrivia', 'Arquata Scrivia', 'Castelnuovo Scrivia',
  ],
  AT: [
    'Asti', 'Nizza Monferrato', 'Canelli', 'San Damiano d\'Asti', 'Villanova d\'Asti',
    'Costigliole d\'Asti', 'Moncalvo',
  ],
  BI: [
    'Biella', 'Cossato', 'Vigliano Biellese', 'Candelo', 'Valdilana', 'Gaglianico',
    'Mongrando', 'Sandigliano', 'Occhieppo Inferiore', 'Trivero',
  ],
  CN: [
    'Cuneo', 'Alba', 'Bra', 'Fossano', 'Mondovì', 'Savigliano', 'Saluzzo', 'Borgo San Dalmazzo',
    'Cherasco', 'Racconigi', 'Dronero', 'Busca', 'Caraglio', 'Limone Piemonte', 'Barolo',
  ],
  NO: [
    'Novara', 'Borgomanero', 'Trecate', 'Galliate', 'Oleggio', 'Arona', 'Cameri', 'Romentino',
    'Castelletto sopra Ticino', 'Vaprio d\'Agogna', 'Bellinzago Novarese',
  ],
  VB: [
    'Verbania', 'Domodossola', 'Omegna', 'Stresa', 'Gravellona Toce', 'Baveno', 'Cannobio',
    'Villadossola', 'Mergozzo', 'Crevoladossola',
  ],
  VC: [
    'Vercelli', 'Borgosesia', 'Santhià', 'Gattinara', 'Crescentino', 'Trino', 'Varallo',
    'Livorno Ferraris', 'Cigliano',
  ],

  // Campania
  NA: [
    'Napoli', 'Giugliano in Campania', 'Torre del Greco', 'Pozzuoli', 'Casoria', 'Castellammare di Stabia',
    'Afragola', 'Portici', 'Ercolano', 'Marano di Napoli', 'Torre Annunziata', 'Casalnuovo di Napoli',
    'Acerra', 'Aversa', 'Frattamaggiore', 'Qualiano', 'Nola', 'Pomigliano d\'Arco', 'Somma Vesuviana',
    'San Giorgio a Cremano', 'Gragnano', 'Pompei', 'Sorrento', 'Ischia', 'Procida', 'Capri',
    'Meta', 'Piano di Sorrento', 'Sant\'Agnello', 'Vico Equense', 'Massa Lubrense', 'Positano',
  ],
  AV: [
    'Avellino', 'Ariano Irpino', 'Atripalda', 'Monteforte Irpino', 'Mercogliano', 'Montella',
    'Solofra', 'Cervinara', 'Montoro', 'Mugnano del Cardinale',
  ],
  BN: [
    'Benevento', 'Montesarchio', 'San Giorgio del Sannio', 'Telese Terme', 'Sant\'Agata de\' Goti',
    'Airola', 'Foglianise', 'Apice', 'Cerreto Sannita', 'Solopaca',
  ],
  CE: [
    'Caserta', 'Aversa', 'Maddaloni', 'Marcianise', 'Mondragone', 'Santa Maria Capua Vetere',
    'San Nicola la Strada', 'Capua', 'Orta di Atella', 'Trentola Ducenta', 'Villa Literno',
    'Castel Volturno', 'Sessa Aurunca', 'Cesa', 'Casal di Principe', 'San Cipriano d\'Aversa',
  ],
  SA: [
    'Salerno', 'Cava de\' Tirreni', 'Battipaglia', 'Nocera Inferiore', 'Scafati', 'Eboli',
    'Pagani', 'Sarno', 'Angri', 'Nocera Superiore', 'Pontecagnano Faiano', 'Capaccio Paestum',
    'Agropoli', 'Mercato San Severino', 'Baronissi', 'Vallo della Lucania', 'Amalfi', 'Positano',
    'Ravello', 'Maiori', 'Minori', 'Vietri sul Mare', 'Cetara', 'Praiano', 'Atrani',
  ],

  // Toscana
  FI: [
    'Firenze', 'Scandicci', 'Sesto Fiorentino', 'Campi Bisenzio', 'Empoli', 'Bagno a Ripoli',
    'Lastra a Signa', 'Pontassieve', 'Fucecchio', 'Borgo San Lorenzo', 'Signa', 'Castelfiorentino',
    'San Casciano in Val di Pesa', 'Fiesole', 'Impruneta', 'Calenzano', 'Barberino di Mugello',
    'Vinci', 'Certaldo', 'Greve in Chianti', 'Figline e Incisa Valdarno', 'Reggello',
  ],
  AR: [
    'Arezzo', 'Cortona', 'San Giovanni Valdarno', 'Montevarchi', 'Sansepolcro', 'Bibbiena',
    'Terranuova Bracciolini', 'Castiglion Fiorentino', 'Foiano della Chiana', 'Cavriglia',
  ],
  GR: [
    'Grosseto', 'Follonica', 'Orbetello', 'Manciano', 'Massa Marittima', 'Castiglione della Pescaia',
    'Monte Argentario', 'Roccastrada', 'Scarlino', 'Gavorrano',
  ],
  LI: [
    'Livorno', 'Piombino', 'Rosignano Marittimo', 'Cecina', 'Collesalvetti', 'San Vincenzo',
    'Campiglia Marittima', 'Portoferraio', 'Castagneto Carducci', 'Capraia Isola',
  ],
  LU: [
    'Lucca', 'Viareggio', 'Capannori', 'Camaiore', 'Pietrasanta', 'Massarosa', 'Altopascio',
    'Forte dei Marmi', 'Seravezza', 'Barga', 'Porcari', 'Montecarlo', 'Pescaglia',
  ],
  MS: [
    'Massa', 'Carrara', 'Pontremoli', 'Aulla', 'Fivizzano', 'Villafranca in Lunigiana',
    'Montignoso', 'Fosdinovo', 'Licciana Nardi', 'Mulazzo',
  ],
  PI: [
    'Pisa', 'Cascina', 'San Giuliano Terme', 'Pontedera', 'San Miniato', 'Ponsacco',
    'Santa Croce sull\'Arno', 'Volterra', 'Calcinaia', 'Vicopisano', 'Castelfranco di Sotto',
  ],
  PO: [
    'Prato', 'Montemurlo', 'Carmignano', 'Poggio a Caiano', 'Vaiano', 'Vernio', 'Cantagallo',
  ],
  PT: [
    'Pistoia', 'Monsummano Terme', 'Quarrata', 'Pescia', 'Montecatini-Terme', 'Agliana',
    'Serravalle Pistoiese', 'Larciano', 'Pieve a Nievole', 'Lamporecchio', 'Ponte Buggianese',
  ],
  SI: [
    'Siena', 'Poggibonsi', 'Colle di Val d\'Elsa', 'Montepulciano', 'Chiusi', 'Montalcino',
    'San Gimignano', 'Chianciano Terme', 'Sinalunga', 'Sovicille', 'Asciano', 'Monteriggioni',
  ],

  // Veneto
  VE: [
    'Venezia', 'Chioggia', 'San Donà di Piave', 'Mira', 'Mirano', 'Spinea', 'Dolo', 'Jesolo',
    'Portogruaro', 'Martellago', 'Noale', 'Scorzè', 'Caorle', 'Marcon', 'Salzano', 'Vigonovo',
    'Fossalta di Portogruaro', 'Cavallino-Treporti', 'Stra', 'Eraclea', 'Musile di Piave',
    'Santa Maria di Sala', 'Fiesso d\'Artico', 'Mogliano Veneto', 'Burano', 'Murano', 'Lido',
  ],
  BL: [
    'Belluno', 'Feltre', 'Sedico', 'Ponte nelle Alpi', 'Mel', 'Longarone', 'Agordo',
    'Pieve di Cadore', 'Auronzo di Cadore', 'Cortina d\'Ampezzo', 'Santo Stefano di Cadore',
  ],
  PD: [
    'Padova', 'Abano Terme', 'Albignasego', 'Vigonza', 'Selvazzano Dentro', 'Cadoneghe',
    'Este', 'Monselice', 'Cittadella', 'Montegrotto Terme', 'Piove di Sacco', 'Rubano',
    'Saonara', 'Noventa Padovana', 'Limena', 'Ponte San Nicolò', 'Vigodarzere', 'Conselve',
  ],
  RO: [
    'Rovigo', 'Adria', 'Porto Viro', 'Badia Polesine', 'Lendinara', 'Occhiobello', 'Porto Tolle',
    'Taglio di Po', 'Ficarolo', 'Castelmassa', 'Villadose', 'Loreo',
  ],
  TV: [
    'Treviso', 'Conegliano', 'Castelfranco Veneto', 'Montebelluna', 'Vittorio Veneto', 'Oderzo',
    'Mogliano Veneto', 'Paese', 'Preganziol', 'Villorba', 'Roncade', 'Silea', 'Spresiano',
    'San Biagio di Callalta', 'Ponzano Veneto', 'Casier', 'Vedelago', 'Zero Branco',
  ],
  VI: [
    'Vicenza', 'Bassano del Grappa', 'Schio', 'Valdagno', 'Arzignano', 'Thiene', 'Montecchio Maggiore',
    'Lonigo', 'Dueville', 'Cassola', 'Chiampo', 'Malo', 'Noventa Vicentina', 'Torri di Quartesolo',
    'Marostica', 'Altavilla Vicentina', 'Sandrigo', 'Creazzo', 'Romano d\'Ezzelino', 'Rosà',
  ],
  VR: [
    'Verona', 'Villafranca di Verona', 'Legnago', 'San Giovanni Lupatoto', 'San Bonifacio',
    'Bussolengo', 'Negrar di Valpolicella', 'Pescantina', 'San Martino Buon Albergo', 'Colognola ai Colli',
    'Grezzana', 'Cerea', 'Bovolone', 'Sommacampagna', 'Sona', 'Isola della Scala', 'Nogara',
    'Bardolino', 'Peschiera del Garda', 'Lazise', 'Castelnuovo del Garda', 'Malcesine', 'Garda',
  ],

  // Emilia-Romagna
  BO: [
    'Bologna', 'Imola', 'Casalecchio di Reno', 'San Lazzaro di Savena', 'San Giovanni in Persiceto',
    'Castel Maggiore', 'Cento', 'Zola Predosa', 'Pianoro', 'Valsamoggia', 'Budrio', 'Castenaso',
    'Medicina', 'Granarolo dell\'Emilia', 'San Pietro in Casale', 'Argelato', 'Calderara di Reno',
    'Molinella', 'Ozzano dell\'Emilia', 'Anzola dell\'Emilia', 'Crevalcore', 'Castel San Pietro Terme',
  ],
  FC: [
    'Forlì', 'Cesena', 'Cesenatico', 'Savignano sul Rubicone', 'San Mauro Pascoli', 'Gambettola',
    'Forlimpopoli', 'Meldola', 'Gatteo', 'Bertinoro', 'Longiano', 'Bagno di Romagna',
  ],
  FE: [
    'Ferrara', 'Cento', 'Argenta', 'Copparo', 'Comacchio', 'Portomaggiore', 'Bondeno',
    'Codigoro', 'Fiscaglia', 'Lagosanto', 'Terre del Reno',
  ],
  MO: [
    'Modena', 'Carpi', 'Sassuolo', 'Formigine', 'Castelfranco Emilia', 'Vignola', 'Maranello',
    'Mirandola', 'Fiorano Modenese', 'Pavullo nel Frignano', 'Spilamberto', 'Soliera', 'Nonantola',
    'Finale Emilia', 'Castelnuovo Rangone', 'San Cesario sul Panaro', 'Concordia sulla Secchia',
  ],
  PR: [
    'Parma', 'Fidenza', 'Colorno', 'Noceto', 'Salsomaggiore Terme', 'San Secondo Parmense',
    'Sorbolo Mezzani', 'Traversetolo', 'Langhirano', 'Montechiarugolo', 'Torrile', 'Fontanellato',
    'Medesano', 'Felino', 'Collecchio', 'Busseto', 'Fornovo di Taro', 'Soragna',
  ],
  PC: [
    'Piacenza', 'Fiorenzuola d\'Arda', 'Castel San Giovanni', 'Rottofreno', 'Pontenure',
    'Podenzano', 'Alseno', 'Carpaneto Piacentino', 'Borgonovo Val Tidone', 'Cadeo', 'Gragnano Trebbiense',
  ],
  RA: [
    'Ravenna', 'Faenza', 'Lugo', 'Cervia', 'Russi', 'Alfonsine', 'Bagnacavallo', 'Conselice',
    'Cotignola', 'Massa Lombarda', 'Riolo Terme', 'Casola Valsenio',
  ],
  RE: [
    'Reggio Emilia', 'Correggio', 'Scandiano', 'Casalgrande', 'Rubiera', 'Guastalla', 'Sant\'Ilario d\'Enza',
    'Montecchio Emilia', 'Castelnovo ne\' Monti', 'Cavriago', 'Albinea', 'Castellarano', 'Novellara',
    'Cadelbosco di Sopra', 'Bagnolo in Piano', 'Bibbiano', 'Quattro Castella', 'Campagnola Emilia',
  ],
  RN: [
    'Rimini', 'Riccione', 'Santarcangelo di Romagna', 'Cattolica', 'Misano Adriatico', 'Bellaria-Igea Marina',
    'Coriano', 'Novafeltria', 'Verucchio', 'Morciano di Romagna', 'San Giovanni in Marignano',
  ],

  // Puglia
  BA: [
    'Bari', 'Altamura', 'Molfetta', 'Bitonto', 'Corato', 'Gravina in Puglia', 'Monopoli',
    'Modugno', 'Triggiano', 'Ruvo di Puglia', 'Conversano', 'Giovinazzo', 'Putignano',
    'Acquaviva delle Fonti', 'Polignano a Mare', 'Noicattaro', 'Terlizzi', 'Capurso', 'Valenzano',
    'Mola di Bari', 'Adelfia', 'Santeramo in Colle', 'Noci', 'Gioia del Colle', 'Casamassima',
  ],
  BR: [
    'Brindisi', 'Fasano', 'Francavilla Fontana', 'Ostuni', 'Mesagne', 'Ceglie Messapica',
    'San Vito dei Normanni', 'Latiano', 'Oria', 'Carovigno', 'Cisternino', 'San Pietro Vernotico',
  ],
  BT: [
    'Andria', 'Barletta', 'Trani', 'Bisceglie', 'Canosa di Puglia', 'Trinitapoli', 'San Ferdinando di Puglia',
    'Margherita di Savoia', 'Minervino Murge', 'Spinazzola',
  ],
  FG: [
    'Foggia', 'Cerignola', 'San Severo', 'Manfredonia', 'Lucera', 'San Giovanni Rotondo',
    'Monte Sant\'Angelo', 'Vieste', 'Orta Nova', 'Torremaggiore', 'Apricena', 'Trinitapoli',
  ],
  LE: [
    'Lecce', 'Nardò', 'Galatina', 'Copertino', 'Casarano', 'Tricase', 'Gallipoli', 'Maglie',
    'Surbo', 'Leverano', 'Taurisano', 'Matino', 'Squinzano', 'Veglie', 'Taviano', 'Racale',
    'Ugento', 'Otranto', 'Santa Maria di Leuca', 'Porto Cesareo', 'Martano', 'Galatone',
  ],
  TA: [
    'Taranto', 'Martina Franca', 'Massafra', 'Grottaglie', 'Manduria', 'Ginosa', 'Castellaneta',
    'Sava', 'San Giorgio Ionico', 'Pulsano', 'Mottola', 'Palagiano', 'Crispiano', 'Laterza',
  ],

  // Sicilia
  CT: [
    'Catania', 'Acireale', 'Misterbianco', 'Paternò', 'Gravina di Catania', 'Belpasso', 'Caltagirone',
    'Mascalucia', 'San Giovanni la Punta', 'Aci Catena', 'Giarre', 'Tremestieri Etneo', 'Pedara',
    'Adrano', 'Biancavilla', 'Bronte', 'Motta Sant\'Anastasia', 'Sant\'Agata li Battiati', 'Viagrande',
  ],
  PA: [
    'Palermo', 'Bagheria', 'Carini', 'Monreale', 'Partinico', 'Termini Imerese', 'Misilmeri',
    'Villabate', 'Cefalù', 'Ficarazzi', 'Capaci', 'Isola delle Femmine', 'Altavilla Milicia',
    'Casteldaccia', 'Santa Flavia', 'Trabia', 'Balestrate', 'Cinisi', 'Terrasini', 'Corleone',
  ],
  AG: [
    'Agrigento', 'Sciacca', 'Favara', 'Licata', 'Canicattì', 'Porto Empedocle', 'Ribera',
    'Menfi', 'Aragona', 'Palma di Montechiaro', 'Raffadali', 'Realmonte', 'Lampedusa',
  ],
  CL: [
    'Caltanissetta', 'Gela', 'Niscemi', 'San Cataldo', 'Mussomeli', 'Riesi', 'Sommatino',
    'Mazzarino', 'Delia', 'Campofranco', 'Serradifalco',
  ],
  EN: [
    'Enna', 'Piazza Armerina', 'Leonforte', 'Barrafranca', 'Nicosia', 'Agira', 'Troina',
    'Regalbuto', 'Centuripe', 'Valguarnera Caropepe', 'Assoro', 'Villarosa',
  ],
  ME: [
    'Messina', 'Barcellona Pozzo di Gotto', 'Milazzo', 'Patti', 'Taormina', 'Sant\'Agata di Militello',
    'Capo d\'Orlando', 'Lipari', 'Giardini-Naxos', 'Letojanni', 'Castelmola', 'Villafranca Tirrena',
  ],
  RG: [
    'Ragusa', 'Vittoria', 'Modica', 'Comiso', 'Scicli', 'Ispica', 'Pozzallo', 'Santa Croce Camerina',
    'Chiaramonte Gulfi', 'Acate', 'Monterosso Almo', 'Giarratana',
  ],
  SR: [
    'Siracusa', 'Augusta', 'Noto', 'Avola', 'Floridia', 'Lentini', 'Carlentini', 'Priolo Gargallo',
    'Francofonte', 'Sortino', 'Rosolini', 'Pachino', 'Melilli', 'Solarino', 'Palazzolo Acreide',
  ],
  TP: [
    'Trapani', 'Marsala', 'Mazara del Vallo', 'Alcamo', 'Castelvetrano', 'Erice', 'Campobello di Mazara',
    'Valderice', 'Castellammare del Golfo', 'San Vito Lo Capo', 'Favignana', 'Pantelleria', 'Salemi',
  ],

  // Sardegna
  CA: [
    'Cagliari', 'Quartu Sant\'Elena', 'Selargius', 'Assemini', 'Monserrato', 'Sestu', 'Quartucciu',
    'Capoterra', 'Elmas', 'Pula', 'Sinnai', 'Maracalagonis', 'Decimomannu', 'Sarroch', 'Villasor',
  ],
  NU: [
    'Nuoro', 'Siniscola', 'Macomer', 'Orosei', 'Bitti', 'Dorgali', 'Gavoi', 'Oliena',
    'Orgosolo', 'Ottana', 'Sorgono', 'Teti', 'Fonni', 'Desulo', 'Mamoiada',
  ],
  OR: [
    'Oristano', 'Cabras', 'Terralba', 'Bosa', 'Samugheo', 'Arborea', 'Marrubiu', 'Cuglieri',
    'Ghilarza', 'Ales', 'Mogoro', 'Usellus', 'Laconi', 'Simaxis', 'Santu Lussurgiu',
  ],
  SS: [
    'Sassari', 'Alghero', 'Porto Torres', 'Tempio Pausania', 'Olbia', 'La Maddalena', 'Ozieri',
    'Sorso', 'Sennori', 'Castelsardo', 'Valledoria', 'Arzachena', 'Santa Teresa Gallura', 'Palau',
  ],
  SU: [
    'Carbonia', 'Iglesias', 'Sant\'Antioco', 'Guspini', 'San Gavino Monreale', 'Villacidro',
    'Sanluri', 'Serramanna', 'Samassi', 'Calasetta', 'Carloforte', 'Portoscuso', 'Domusnovas',
  ],

  // Other regions with main cities
  AO: ['Aosta', 'Saint-Vincent', 'Courmayeur', 'Châtillon', 'Sarre', 'Gressan', 'Quart', 'Nus', 'Cogne', 'La Thuile', 'Pré-Saint-Didier', 'Morgex'],
  BZ: ['Bolzano', 'Merano', 'Bressanone', 'Laives', 'Brunico', 'Appiano sulla Strada del Vino', 'Lana', 'Silandro', 'Vipiteno', 'Chiusa', 'Ortisei', 'Castelrotto'],
  TN: ['Trento', 'Rovereto', 'Pergine Valsugana', 'Arco', 'Riva del Garda', 'Mori', 'Lavis', 'Levico Terme', 'Cles', 'Pinzolo', 'Madonna di Campiglio', 'Moena'],
  TS: ['Trieste', 'Muggia', 'Duino-Aurisina', 'Sgonico', 'Monrupino', 'San Dorligo della Valle'],
  GO: ['Gorizia', 'Monfalcone', 'Grado', 'Ronchi dei Legionari', 'Cormons', 'Gradisca d\'Isonzo', 'Staranzano', 'San Canzian d\'Isonzo'],
  PN: ['Pordenone', 'Sacile', 'Cordenons', 'Maniago', 'Azzano Decimo', 'Fiume Veneto', 'San Vito al Tagliamento', 'Spilimbergo', 'Brugnera'],
  UD: ['Udine', 'Codroipo', 'Tavagnacco', 'Cervignano del Friuli', 'Latisana', 'San Daniele del Friuli', 'Cividale del Friuli', 'Palmanova', 'Gemona del Friuli', 'Tolmezzo'],
  PG: ['Perugia', 'Foligno', 'Città di Castello', 'Spoleto', 'Gubbio', 'Assisi', 'Bastia Umbra', 'Todi', 'Corciano', 'Umbertide', 'Deruta', 'Marsciano', 'Castiglione del Lago'],
  TR: ['Terni', 'Orvieto', 'Narni', 'Amelia', 'Acquasparta', 'San Gemini', 'Montecastrilli', 'Stroncone', 'Arrone'],
  AN: ['Ancona', 'Jesi', 'Senigallia', 'Fabriano', 'Osimo', 'Falconara Marittima', 'Chiaravalle', 'Castelfidardo', 'Loreto', 'Filottrano', 'Camerano'],
  AP: ['Ascoli Piceno', 'San Benedetto del Tronto', 'Grottammare', 'Spinetoli', 'Monteprandone', 'Folignano', 'Offida', 'Acquasanta Terme', 'Arquata del Tronto'],
  FM: ['Fermo', 'Porto Sant\'Elpidio', 'Porto San Giorgio', 'Sant\'Elpidio a Mare', 'Montegranaro', 'Monte Urano', 'Falerone', 'Montegiorgio', 'Petritoli'],
  MC: ['Macerata', 'Civitanova Marche', 'Tolentino', 'Recanati', 'Potenza Picena', 'Corridonia', 'Matelica', 'San Severino Marche', 'Camerino', 'Morrovalle', 'Porto Recanati'],
  PU: ['Pesaro', 'Fano', 'Urbino', 'Fossombrone', 'Cagli', 'Pergola', 'Mondavio', 'Gabicce Mare', 'Urbania', 'Montelabbate', 'Cartoceto'],
  CB: ['Campobasso', 'Termoli', 'Isernia', 'Bojano', 'Larino', 'Montenero di Bisaccia', 'Campomarino', 'Guglionesi', 'Venafro', 'Agnone'],
  IS: ['Isernia', 'Venafro', 'Agnone', 'Frosolone', 'Castel San Vincenzo', 'Rocchetta a Volturno', 'Colli a Volturno'],
  AQ: ['L\'Aquila', 'Avezzano', 'Sulmona', 'Celano', 'Tagliacozzo', 'Pescina', 'Carsoli', 'Pratola Peligna', 'Castel di Sangro', 'Roccaraso'],
  CH: ['Chieti', 'Lanciano', 'Vasto', 'Francavilla al Mare', 'San Giovanni Teatino', 'Ortona', 'San Salvo', 'Atessa', 'Guardiagrele', 'Casalbordino'],
  PE: ['Pescara', 'Montesilvano', 'Spoltore', 'Città Sant\'Angelo', 'Cepagatti', 'Penne', 'Cappelle sul Tavo', 'Silvi', 'Loreto Aprutino', 'Manoppello'],
  TE: ['Teramo', 'Giulianova', 'Roseto degli Abruzzi', 'Alba Adriatica', 'Martinsicuro', 'Pineto', 'Tortoreto', 'Nereto', 'Sant\'Omero', 'Atri', 'Silvi Marina'],
  PZ: ['Potenza', 'Matera', 'Melfi', 'Pisticci', 'Policoro', 'Lauria', 'Venosa', 'Rionero in Vulture', 'Bernalda', 'Avigliano', 'Scanzano Jonico', 'Nova Siri'],
  MT: ['Matera', 'Pisticci', 'Policoro', 'Bernalda', 'Montescaglioso', 'Tricarico', 'Stigliano', 'Ferrandina', 'Tursi', 'Grassano'],
  CS: ['Cosenza', 'Corigliano-Rossano', 'Rende', 'Castrovillari', 'Paola', 'Acri', 'Amantea', 'Scalea', 'San Giovanni in Fiore', 'Cassano all\'Ionio', 'Belvedere Marittimo', 'Diamante'],
  CZ: ['Catanzaro', 'Lamezia Terme', 'Soverato', 'Sellia Marina', 'Botricello', 'Squillace', 'Borgia', 'Cropani', 'Settingiano', 'Davoli'],
  KR: ['Crotone', 'Isola di Capo Rizzuto', 'Cirò Marina', 'Cutro', 'Mesoraca', 'Petilia Policastro', 'Santa Severina', 'Cotronei', 'Strongoli'],
  RC: ['Reggio Calabria', 'Gioia Tauro', 'Siderno', 'Locri', 'Taurianova', 'Palmi', 'Bagnara Calabra', 'Villa San Giovanni', 'Polistena', 'Melito di Porto Salvo', 'Scilla', 'Tropea'],
  VV: ['Vibo Valentia', 'Tropea', 'Pizzo', 'Serra San Bruno', 'Mileto', 'Ricadi', 'Nicotera', 'Filadelfia', 'Soriano Calabro', 'Briatico'],
};

/**
 * Get province by code
 * @param {string} code - Province code (e.g., 'MI', 'RM')
 * @returns {Object|null} - Province object or null
 */
export const getProvinceByCode = (code) => {
  if (!code) return null;
  return ITALIAN_PROVINCES.find(p => p.code.toUpperCase() === code.toUpperCase()) || null;
};

/**
 * Get province by name (supports partial match)
 * @param {string} name - Province name (e.g., 'Milano', 'Roma')
 * @returns {Object|null} - Province object or null
 */
export const getProvinceByName = (name) => {
  if (!name) return null;
  const normalizedName = name.toLowerCase().trim();
  return ITALIAN_PROVINCES.find(p => 
    p.name.toLowerCase() === normalizedName ||
    p.name.toLowerCase().includes(normalizedName)
  ) || null;
};

/**
 * Get cities for a province
 * @param {string} provinceCode - Province code (e.g., 'MI', 'RM')
 * @returns {Array<string>} - Array of city names
 */
export const getCitiesByProvinceCode = (provinceCode) => {
  if (!provinceCode) return [];
  return ITALIAN_CITIES_BY_PROVINCE[provinceCode.toUpperCase()] || [];
};

/**
 * Get all provinces sorted by code
 * @returns {Array<Object>} - Array of all provinces
 */
export const getAllProvincesSorted = () => {
  return [...ITALIAN_PROVINCES].sort((a, b) => a.code.localeCompare(b.code));
};

/**
 * Get provinces by region
 * @param {string} region - Region name (e.g., 'Lombardia', 'Lazio')
 * @returns {Array<Object>} - Array of provinces in that region
 */
export const getProvincesByRegion = (region) => {
  if (!region) return [];
  const normalizedRegion = region.toLowerCase().trim();
  return ITALIAN_PROVINCES.filter(p => 
    p.region.toLowerCase() === normalizedRegion ||
    p.region.toLowerCase().includes(normalizedRegion)
  );
};

/**
 * Find province and city from a city name (useful for autocomplete)
 * @param {string} cityName - City name
 * @returns {Object|null} - { province, city } or null
 */
export const findProvinceByCity = (cityName) => {
  if (!cityName) return null;
  const normalizedCity = cityName.toLowerCase().trim();
  
  for (const [provinceCode, cities] of Object.entries(ITALIAN_CITIES_BY_PROVINCE)) {
    const foundCity = cities.find(c => c.toLowerCase() === normalizedCity);
    if (foundCity) {
      const province = getProvinceByCode(provinceCode);
      return { province, city: foundCity };
    }
  }
  return null;
};
