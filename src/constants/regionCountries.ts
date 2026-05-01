export type RegionDef = {
  key: string;
  label: string;
  countryNames: string[];
};

export const REGION_GROUPS: RegionDef[] = [
  {
    key: 'north_america',
    label: 'North America',
    countryNames: [
      'United States', 'Canada', 'Mexico', 'Puerto Rico', 'Honduras', 'El Salvador',
      'Bermuda', 'Trinidad And Tobago', 'Jamaica', 'Dominican Republic',
      'Netherlands Antilles', 'Costa Rica', 'Cayman Islands', 'Belize',
      'British Virgin Islands', 'Panama', 'Guadeloupe', 'Cuba', 'Haiti',
      'Guatemala', 'Barbados', 'Bahamas', 'Antigua And Barbuda', 'Nicaragua',
      'Grenada', 'Aruba', 'Martinique', 'U.S. Virgin Islands',
      'Turks And Caicos Islands', 'Anguilla', 'Saint Lucia',
      'Saint Kitts And Nevis', 'Montserrat', 'Greenland', 'Dominica',
      'Curaçao', 'Saint Vincent And The Grenadines', 'Saint Pierre And Miquelon',
      'Saint Helena', 'Saint Barthélemy', 'Caribbean Netherlands', 'Saint Martin',
    ],
  },
  {
    key: 'south_america',
    label: 'South America',
    countryNames: [
      'Brazil', 'Argentina', 'Peru', 'Chile', 'Colombia', 'Uruguay', 'Bolivia',
      'Venezuela', 'Ecuador', 'Paraguay', 'Suriname', 'French Guiana', 'Guyana',
      'Falkland Islands',
    ],
  },
  {
    key: 'europe',
    label: 'Europe',
    countryNames: [
      'Netherlands', 'United Kingdom', 'Guernsey', 'Germany', 'Switzerland',
      'Ireland', 'Hungary', 'Italy', 'Ukraine', 'Belgium', 'Czechia', 'Portugal',
      'Denmark', 'Spain', 'France', 'Sweden', 'Poland', 'Finland', 'Romania',
      'Luxembourg', 'Norway', 'Austria', 'Estonia', 'Malta', 'Russia', 'Croatia',
      'Cyprus', 'Greece', 'Montenegro', 'Bosnia And Herzegovina', 'Slovakia',
      'Latvia', 'Moldova', 'Monaco', 'Belarus', 'Bulgaria', 'Serbia', 'Macedonia',
      'Slovenia', 'Gibraltar', 'Liechtenstein', 'Lithuania', 'Iceland',
      'Faroe Islands', 'Albania', 'Jersey', 'Isle Of Man', 'Åland Islands',
      'Kosovo', 'Vatican City', 'San Marino', 'Andorra', 'Svalbard And Jan Mayen',
    ],
  },
  {
    key: 'asia',
    label: 'Asia',
    countryNames: [
      'Afghanistan', 'Turkey', 'Japan', 'India', 'China', 'Israel', 'Singapore',
      'Oman', 'Thailand', 'Malaysia', 'Philippines', 'Pakistan',
      'United Arab Emirates', 'Saudi Arabia', 'South Korea', 'Bahrain', 'Kuwait',
      'Lebanon', 'Indonesia', 'Taiwan', 'Qatar', 'Nepal', 'Iran', 'Jordan',
      'Myanmar', 'Macau', 'Syria', 'Hong Kong', 'Vietnam', 'Bangladesh',
      'Mongolia', 'Sri Lanka', 'Kazakhstan', 'Azerbaijan', 'Georgia', 'Iraq',
      'Palestine', 'Cambodia', 'Maldives', 'Armenia', 'Brunei', 'Laos', 'Yemen',
      'Bhutan', 'Turkmenistan', 'Uzbekistan', 'Kyrgyzstan', 'Timor-Leste',
      'Tajikistan', 'British Indian Ocean Territory', 'Christmas Island',
      'North Korea',
    ],
  },
  {
    key: 'africa',
    label: 'Africa',
    countryNames: [
      'Kenya', 'Togo', 'South Africa', 'Ghana', 'Morocco', 'Nigeria', 'Botswana',
      'Niger', "Côte D'Ivoire", 'Egypt', 'Angola', 'Zimbabwe', 'Algeria',
      'Mauritius', 'Djibouti', 'Tanzania', 'Cameroon', 'Burkina Faso', 'Gabon',
      'Tunisia', 'Uganda', 'Ethiopia', 'Senegal', 'Swaziland', 'Libya', 'Malawi',
      'Seychelles', 'Zambia', 'Democratic Republic Of The Congo', 'Madagascar',
      'Sudan', 'Rwanda', 'Mozambique', 'Eritrea', 'Mali', 'Namibia', 'Lesotho',
      'Sierra Leone', 'Benin', 'Mauritania', 'Somalia', 'Chad', 'Gambia',
      'Equatorial Guinea', 'Republic Of The Congo', 'Guinea-Bissau', 'Guinea',
      'Réunion', 'Liberia', 'Comoros', 'Central African Republic', 'Burundi',
      'Mayotte', 'South Sudan', 'Cape Verde', 'Western Sahara',
    ],
  },
  {
    key: 'oceania',
    label: 'Oceania',
    countryNames: [
      'Australia', 'New Zealand', 'Guam', 'Papua New Guinea', 'Fiji', 'Tuvalu',
      'Northern Mariana Islands', 'New Caledonia', 'Norfolk Island', 'Vanuatu',
      'French Polynesia', 'American Samoa', 'Micronesia', 'Marshall Islands',
      'Pitcairn', 'Nauru', 'Cocos (Keeling) Islands', 'Samoa', 'Palau', 'Tonga',
      'Solomon Islands', 'Cook Islands', 'Kiribati', 'Wallis And Futuna', 'Niue',
      'Tokelau',
    ],
  },
];
