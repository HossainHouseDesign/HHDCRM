
export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Anguilla", "Antigua & Barbuda", "Argentina", "Armenia", "Aruba", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia", "Bosnia & Herzegovina", "Botswana", "Brazil", "British Virgin Islands", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Cayman Islands", "Central Arfrican Republic", "Chad", "Chile", "China", "Colombia", "Congo", "Cook Islands", "Costa Rica", "Cote D Ivoire", "Croatia", "Cuba", "Curacao", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Falkland Islands", "Faroe Islands", "Fiji", "Finland", "France", "French Polynesia", "French West Indies", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Gibraltar", "Greece", "Greenland", "Grenada", "Guam", "Guatemala", "Guernsey", "Guinea", "Guinea Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man", "Israel", "Italy", "Jamaica", "Japan", "Jersey", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Montserrat", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauro", "Nepal", "Netherlands", "Netherlands Antilles", "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Puerto Rico", "Qatar", "Reunion", "Romania", "Russia", "Rwanda", "Saint Pierre & Miquelon", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "St Kitts & Nevis", "St Lucia", "St Vincent", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor L'Este", "Togo", "Tonga", "Trinidad & Tobago", "Tunisia", "Turkey", "Turkmenistan", "Turks & Caicos", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Virgin Islands (US)", "Yemen", "Zambia", "Zimbabwe"
];

export const BD_DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura", "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga", "Cumilla", "Cox's Bazar", "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
].sort();

export const BD_UPAZILA_MAP: Record<string, string[]> = {
  "Dhaka": ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar", "Mirpur", "Gulshan", "Uttara", "Badda", "Ramna", "Tejgaon", "Dhanmondi", "Mohammadpur", "Demra", "Jatrabari", "Pallabi", "Shahbagh"],
  "Chattogram": ["Hathazari", "Patiya", "Raozan", "Sandwip", "Satkania", "Boalkhali", "Anwara", "Chandanaish", "Lohagara", "Banskhali", "Rangunia", "Fatikchhari", "Mirsharai", "Sitakunda", "Karnaphuli"],
  "Sylhet": ["Sylhet Sadar", "Beanibazar", "Golapganj", "Fenchuganj", "Balaganj", "Bishwanath", "Osmani Nagar", "Jaintiapur", "Gowainghat", "Zakiganj", "Kanaighat", "Companiganj", "South Surma"],
  "Netrokona": ["Khaliajuri", "Atpara", "Barhatta", "Durgapur", "Kendua", "Madan", "Mohanganj", "Purbadhala", "Netrokona Sadar", "Kalmakanda"],
  "Bogura": ["Dhunat", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala", "Bogura Sadar", "Adamdighi", "Dupchanchia"],
  "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
  "Brahmanbaria": ["Brahmanbaria Sadar", "Ashuganj", "Bancharampur", "Kasba", "Nabinagar", "Nasirnagar", "Sarail", "Bijoynagar", "Akhaura"],
  "Chandpur": ["Chandpur Sadar", "Faridganj", "Hajiganj", "Hayatpur", "Kachua", "Matlab North", "Matlab South", "Shahrasti"],
  "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"],
  "Jashore": ["Jashore Sadar", "Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
  "Khulna": ["Khulna Sadar", "Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Rupa", "Terokhada"],
  "Pabna": ["Pabna Sadar", "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Santhia", "Sujanagar"],
  "Bhola": ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
  "Noakhali": ["Noakhali Sadar", "Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar", "Kabirhat"],
  "Cumilla": ["Cumilla Sadar", "Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Muradnagar", "Nangalkot", "Titas", "Meghna", "Monohargonj"],
  "Barishal": ["Barishal Sadar", "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
  "Bandarban": ["Bandarban Sadar", "Thanchi", "Lama", "Naikhongchhari", "Alikadam", "Rowangchhari", "Ruma"],
  "Barguna": ["Barguna Sadar", "Amtali", "Betagi", "Bamna", "Patharghata", "Taltali"],
  "Chapainawabganj": ["Chapainawabganj Sadar", "Gomastapur", "Nachole", "Bholahat", "Shibganj"],
  "Chuadanga": ["Chuadanga Sadar", "Alamdanga", "Damurhuda", "Jibannagar"],
  "Cox's Bazar": ["Cox's Bazar Sadar", "Chakaria", "Kutubdia", "Maheshkhali", "Ramu", "Teknaf", "Ukhia", "Pekua"],
  "Dinajpur": ["Dinajpur Sadar", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Phulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"],
  "Faridpur": ["Faridpur Sadar", "Boalmari", "Alfadanga", "Madhukhali", "Bhanga", "Nagarkanda", "Charbhadrasan", "Sadarpur", "Saltha"],
  "Feni": ["Feni Sadar", "Chhagalnaiya", "Daganbhuiyan", "Parshuram", "Sonagazi", "Fulgazi"],
  "Gaibandha": ["Gaibandha Sadar", "Phulchhari", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
  "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
  "Habiganj": ["Habiganj Sadar", "Nabiganj", "Bahubal", "Azmiriganj", "Baniyachong", "Lakhai", "Chunarughat", "Madhabpur", "Shayestaganj"],
  "Jamalpur": ["Jamalpur Sadar", "Bakshiganj", "Dewanganj", "Islampur", "Madarganj", "Melandaha", "Sarishabari"],
  "Jhalokati": ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"],
  "Jhenaidah": ["Jhenaidah Sadar", "Maheshpur", "Kaliganj", "Kotchandpur", "Shailkupa", "Harinakundu"],
  "Joypurhat": ["Joypurhat Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"],
  "Khagrachhari": ["Khagrachhari Sadar", "Dighinala", "Panchhari", "Laxmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Ramgarh"],
  "Kishoreganj": ["Kishoreganj Sadar", "Itna", "Katiadi", "Bhairab", "Tarail", "Hossainpur", "Pakundia", "Kuliarchar", "Karimgonj", "Bajitpur", "Austagram", "Mithamain", "Nikli"],
  "Kurigram": ["Kurigram Sadar", "Nageshwari", "Bhurungamari", "Phulbari", "Rajarhat", "Ulipur", "Chilmari", "Rowmari", "Char Rajibpur"],
  "Kushtia": ["Kushtia Sadar", "Kumarkhali", "Khoksa", "Mirpur", "Daulatpur", "Bheramara"],
  "Lakshmipur": ["Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati", "Kamalnagar"],
  "Lalmonirhat": ["Lalmonirhat Sadar", "Aditmari", "Kaliganj", "Hatibandha", "Patgram"],
  "Madaripur": ["Madaripur Sadar", "Shibchar", "Kalkini", "Rajoir"],
  "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
  "Manikganj": ["Manikganj Sadar", "Singair", "Shibalaya", "Saturia", "Harirampur", "Ghior", "Daulatpur"],
  "Meherpur": ["Meherpur Sadar", "Mujibnagar", "Gangni"],
  "Moulvibazar": ["Moulvibazar Sadar", "Barlekha", "Juri", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal"],
  "Munshiganj": ["Munshiganj Sadar", "Sreenagar", "Sirajdikhan", "Lauhajang", "Gajaria", "Tongibari"],
  "Mymensingh": ["Mymensingh Sadar", "Bhaluka", "Trishal", "Haluaghat", "Muktagachha", "Dhobaura", "Fulbaria", "Gaffargaon", "Gauripur", "Ishwarganj", "Nandail", "Phulpur", "Tara Khanda"],
  "Naogaon": ["Naogaon Sadar", "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mahadevpur", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
  "Narail": ["Narail Sadar", "Lohagara", "Kalia"],
  "Narayanganj": ["Narayanganj Sadar", "Araihazar", "Bandar", "Rupganj", "Sonargaon"],
  "Narsingdi": ["Narsingdi Sadar", "Belabo", "Monohardi", "Palash", "Raipura", "Shibpur"],
  "Natore": ["Natore Sadar", "Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Singra", "Naldanga"],
  "Nilphamari": ["Nilphamari Sadar", "Saidpur", "Jaldhaka", "Kishoreganj", "Domar", "Dimla"],
  "Panchagarh": ["Panchagarh Sadar", "Debiganj", "Boda", "Atwari", "Tetulia"],
  "Patuakhali": ["Patuakhali Sadar", "Bauphal", "Dashmina", "Galachipa", "Kalapara", "Mirzaganj", "Dumki", "Rangabali"],
  "Pirojpur": ["Pirojpur Sadar", "Nazirpur", "Kawkhali", "Bhandaria", "Mathbaria", "Nesarabad", "Indurkani"],
  "Rajbari": ["Rajbari Sadar", "Goalanda", "Pangsha", "Baliakandi", "Kalukhali"],
  "Rajshahi": ["Boalia", "Rajput", "Bagmara", "Durgapur", "Godagari", "Charghat", "Puthia", "Paba", "Bagha", "Mohanpur", "Tanore"],
  "Rangamati": ["Rangamati Sadar", "Belaichhari", "Bagaichhari", "Barkal", "Juraichhari", "Langadu", "Naniyachar", "Rajasthali", "Kaptai", "Kawkhali"],
  "Rangpur": ["Rangpur Sadar", "Badarganj", "Mithapukur", "Gangachara", "Kaunia", "Pirgachha", "Pirganj", "Taraganj"],
  "Satkhira": ["Satkhira Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"],
  "Shariatpur": ["Shariatpur Sadar", "Damudya", "Naria", "Zajira", "Bhedarganj", "Gosairhat"],
  "Sherpur": ["Sherpur Sadar", "Jhenaigati", "Nakla", "Nalitabari", "Sreebardi"],
  "Sirajganj": ["Sirajganj Sadar", "Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Tarash", "Ullahpara"],
  "Sunamganj": ["Sunamganj Sadar", "South Sunamganj", "Bishwamaypur", "Chhatak", "Derai", "Dharamapasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sullah", "Tahirpur"],
  "Tangail": ["Tangail Sadar", "Basail", "Bhuapur", "Delduar", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Dhanbari"],
  "Thakurgaon": ["Thakurgaon Sadar", "Baliadangi", "Haripur", "Ranisankail", "Pirganj"]
};

// Flatten for generic search or validation
export const BD_UPAZILAS = Object.values(BD_UPAZILA_MAP).flat().sort();

export const BD_UNIONS = [
  "Maligacha", "Dogachi", "Hemayetpur", "Gayeshpur", "Bharara", "Dapunia", "Sadiapur", "Atgharia", 
  "Bera", "Santhia", "Enayetpur", "Jalalpur", "Kallayanpur", "Char Ashutoshpur", "Himaitpur",
  "Dohar Union", "Savar Union", "Keraniganj South", "Hathazari North", "Patiya Center"
].sort();
