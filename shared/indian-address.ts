export const otherCityValue = '__other_city__'

export type IndianStateOption = {
  label: string
  pincodePrefixes: readonly string[]
  cities: readonly string[]
}

export const indianStateOptions = [
  {
    label: 'Andaman and Nicobar Islands',
    pincodePrefixes: ['7'],
    cities: ['Port Blair'],
  },
  {
    label: 'Andhra Pradesh',
    pincodePrefixes: ['5'],
    cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kurnool'],
  },
  {
    label: 'Arunachal Pradesh',
    pincodePrefixes: ['7'],
    cities: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  },
  {
    label: 'Assam',
    pincodePrefixes: ['7'],
    cities: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur'],
  },
  {
    label: 'Bihar',
    pincodePrefixes: ['8'],
    cities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'],
  },
  {
    label: 'Chandigarh',
    pincodePrefixes: ['1'],
    cities: ['Chandigarh'],
  },
  {
    label: 'Chhattisgarh',
    pincodePrefixes: ['4'],
    cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
  },
  {
    label: 'Dadra and Nagar Haveli and Daman and Diu',
    pincodePrefixes: ['3'],
    cities: ['Daman', 'Diu', 'Silvassa'],
  },
  {
    label: 'Delhi',
    pincodePrefixes: ['1'],
    cities: ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh'],
  },
  {
    label: 'Goa',
    pincodePrefixes: ['4'],
    cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  },
  {
    label: 'Gujarat',
    pincodePrefixes: ['3'],
    cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar'],
  },
  {
    label: 'Haryana',
    pincodePrefixes: ['1'],
    cities: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal', 'Sonipat'],
  },
  {
    label: 'Himachal Pradesh',
    pincodePrefixes: ['1'],
    cities: ['Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu'],
  },
  {
    label: 'Jammu and Kashmir',
    pincodePrefixes: ['1'],
    cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla'],
  },
  {
    label: 'Jharkhand',
    pincodePrefixes: ['8'],
    cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar'],
  },
  {
    label: 'Karnataka',
    pincodePrefixes: ['5'],
    cities: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Davanagere'],
  },
  {
    label: 'Kerala',
    pincodePrefixes: ['6'],
    cities: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur'],
  },
  {
    label: 'Ladakh',
    pincodePrefixes: ['1'],
    cities: ['Leh', 'Kargil'],
  },
  {
    label: 'Lakshadweep',
    pincodePrefixes: ['6'],
    cities: ['Kavaratti'],
  },
  {
    label: 'Madhya Pradesh',
    pincodePrefixes: ['4'],
    cities: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
  },
  {
    label: 'Maharashtra',
    pincodePrefixes: ['4'],
    cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur'],
  },
  {
    label: 'Manipur',
    pincodePrefixes: ['7'],
    cities: ['Imphal', 'Thoubal', 'Bishnupur'],
  },
  {
    label: 'Meghalaya',
    pincodePrefixes: ['7'],
    cities: ['Shillong', 'Tura', 'Jowai'],
  },
  {
    label: 'Mizoram',
    pincodePrefixes: ['7'],
    cities: ['Aizawl', 'Lunglei', 'Champhai'],
  },
  {
    label: 'Nagaland',
    pincodePrefixes: ['7'],
    cities: ['Kohima', 'Dimapur', 'Mokokchung'],
  },
  {
    label: 'Odisha',
    pincodePrefixes: ['7'],
    cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur', 'Berhampur'],
  },
  {
    label: 'Puducherry',
    pincodePrefixes: ['6'],
    cities: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  },
  {
    label: 'Punjab',
    pincodePrefixes: ['1'],
    cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
  },
  {
    label: 'Rajasthan',
    pincodePrefixes: ['3'],
    cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner'],
  },
  {
    label: 'Sikkim',
    pincodePrefixes: ['7'],
    cities: ['Gangtok', 'Namchi', 'Gyalshing'],
  },
  {
    label: 'Tamil Nadu',
    pincodePrefixes: ['6'],
    cities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur'],
  },
  {
    label: 'Telangana',
    pincodePrefixes: ['5'],
    cities: ['Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam'],
  },
  {
    label: 'Tripura',
    pincodePrefixes: ['7'],
    cities: ['Agartala', 'Udaipur', 'Dharmanagar'],
  },
  {
    label: 'Uttar Pradesh',
    pincodePrefixes: ['2'],
    cities: ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut'],
  },
  {
    label: 'Uttarakhand',
    pincodePrefixes: ['2'],
    cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh'],
  },
  {
    label: 'West Bengal',
    pincodePrefixes: ['7'],
    cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
  },
] as const satisfies readonly IndianStateOption[]

export const indianStateNames = indianStateOptions.map((state) => state.label)

export function getIndianStateOption(stateName: string) {
  return indianStateOptions.find((state) => state.label === stateName)
}

export function getCitiesForIndianState(stateName: string) {
  return getIndianStateOption(stateName)?.cities ?? []
}

export function isKnownIndianState(stateName: string) {
  return Boolean(getIndianStateOption(stateName))
}

export function isKnownCityForIndianState(stateName: string, cityName: string) {
  const normalizedCity = cityName.trim().toLowerCase()
  return getCitiesForIndianState(stateName).some((city) => city.toLowerCase() === normalizedCity)
}

export function isValidIndianPincode(value: string) {
  return /^[1-9]\d{5}$/.test(value.trim())
}

export function isPincodeLikelyForIndianState(pincode: string, stateName: string) {
  const state = getIndianStateOption(stateName)
  if (!state || !isValidIndianPincode(pincode)) return false

  return state.pincodePrefixes.some((prefix) => pincode.startsWith(prefix))
}
