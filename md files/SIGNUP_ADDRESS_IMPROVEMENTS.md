# Signup Address Improvements

## Overview

The signup page address entry flow has been significantly improved to provide better UX and more accurate address data capture. Two major enhancements have been implemented.

## Changes Implemented

### 1. **Separate Street and Street Number Fields**

**Previous Behavior:**
- Manual address entry had a single "Street address" field that combined street name and number

**New Behavior:**
- Street name and street number are now **separate fields displayed side by side**
- Street field takes 2/3 of the width, number field takes 1/3
- **Both fields are mandatory** (required validation)
- Makes it clearer for users to enter structured address data

**Visual Layout:**
```
┌──────────────────────────────┬──────────────┐
│ Street name *                │ Number *     │
│ Via Principale               │ 123          │
└──────────────────────────────┴──────────────┘
```

**Validation:**
- Street name: Required ✅
- Street number: Required ✅
- Apartment/Suite: Optional (as before)

### 2. **Automatic Form Expansion After Autocomplete**

**Previous Behavior:**
- User selects address from autocomplete
- Only the autocomplete field was populated
- User had to manually toggle to see full address details

**New Behavior:**
- When user selects an address from autocomplete, the form **automatically expands** to show all address fields
- All fields are **prefilled** with data from the selected address:
  - Street name
  - Street number
  - City
  - State/Province
  - Postal code
  - Country
- User can **review and verify** all components before submitting
- If user **modifies any field**, geolocation coordinates are **NOT saved** (only the text address)
- If user **doesn't modify** anything, geolocation coordinates **ARE saved** (for later use in listing creation)

## Technical Implementation

### State Management

New state variables added:
```javascript
const [autocompleteUsed, setAutocompleteUsed] = useState(false); // Track if autocomplete was used
```

### Flow Logic

#### Autocomplete Selection Flow:
1. User types in autocomplete field
2. User selects an address from suggestions
3. `useEffect` detects the selection
4. Address components are extracted (street, streetNumber, city, state, postalCode, country)
5. Geolocation coordinates are stored
6. `autocompleteUsed` is set to `true`
7. Form automatically switches to expanded view
8. All fields are prefilled with the extracted data
9. User can review and modify if needed

#### Manual Entry Flow:
1. User checks "Can't find your address? Enter it manually"
2. Expanded form is shown with empty fields
3. User fills in street, streetNumber, city, state, postalCode, country
4. No geolocation is stored (since it wasn't from autocomplete)

#### Geolocation Decision Logic:
```javascript
// Geolocation is ONLY saved if:
// 1. Autocomplete was used (autocompleteUsed === true)
// 2. AND user didn't modify any fields (manualFieldsChanged === false)

if (selectedGeolocation && !manualFieldsChanged && autocompleteUsed) {
  addressInfo.geolocation = selectedGeolocation;
}
```

### Data Storage Format

**In `privateData.address`:**
```javascript
{
  addressLine1: "Via Principale 123",      // Combined from street + streetNumber
  addressLine2: "Appartamento 5B",         // Optional
  city: "Roma",
  state: "RM",
  postalCode: "00100",
  country: "Italia",
  geolocation: {                            // Only if autocomplete used and not modified
    lat: 41.9028,
    lng: 12.4964
  }
}
```

## User Experience Improvements

### Before:
❌ Single combined street address field  
❌ Autocomplete selection didn't show details  
❌ Couldn't verify extracted address components  
❌ Geolocation saved even when address manually modified  

### After:
✅ Separate street name and number fields  
✅ Autocomplete automatically expands to show all details  
✅ User can review and verify all address components  
✅ Geolocation only saved if data is unmodified  

## CSS Changes

Added new field styles in `NewSignupPage.module.css`:

```css
.streetField {
  flex: 2; /* Takes 2/3 of the space */
}

.streetNumberField {
  flex: 1; /* Takes 1/3 of the space */
}
```

## Translation Updates

New translation keys added to **all 6 language files** (en, it, de, es, fr, pt):

- `NewSignupPage.streetLabel` - "Street name" / "Nome via"
- `NewSignupPage.streetPlaceholder` - "Main Street" / "Via Principale"
- `NewSignupPage.streetRequired` - "Street name is required" / "Il nome della via è obbligatorio"
- `NewSignupPage.streetNumberLabel` - "Number" / "Numero"
- `NewSignupPage.streetNumberPlaceholder` - "123" / "123"
- `NewSignupPage.streetNumberRequired` - "Street number is required" / "Il numero civico è obbligatorio"

## Benefits

### For Users:
1. **Clearer input structure** - Separate fields for street name and number
2. **Better verification** - Can see and verify all address components before submitting
3. **Flexibility** - Can correct autocomplete mistakes without losing geolocation benefit

### For Listing Creation:
1. **Accurate geolocation** - Only stored when address is verified and unmodified
2. **Better prefilling** - When creating listings, user address is prefilled (see LOCATION_PREFILL_IMPLEMENTATION.md)
3. **Data quality** - Structured address data is easier to work with

## Testing Scenarios

### Test Case 1: Autocomplete Without Modifications
1. Start signup
2. Type address in autocomplete field
3. Select address from suggestions
4. **Expected**: Form expands, all fields prefilled
5. Submit without modifying any field
6. **Expected**: Address saved WITH geolocation coordinates

### Test Case 2: Autocomplete With Modifications
1. Start signup
2. Type address in autocomplete field
3. Select address from suggestions
4. **Expected**: Form expands, all fields prefilled
5. Modify any field (e.g., change street number)
6. Submit
7. **Expected**: Address saved WITHOUT geolocation coordinates

### Test Case 3: Manual Entry
1. Start signup
2. Check "Enter manually" checkbox
3. **Expected**: Form shows with empty street and streetNumber fields
4. Fill in all address fields manually
5. Submit
6. **Expected**: Address saved WITHOUT geolocation coordinates

### Test Case 4: Mobile Responsiveness
1. Open signup on mobile device
2. Use autocomplete or manual entry
3. **Expected**: Fields stack vertically on small screens
4. **Expected**: Street and streetNumber fields still side by side if space allows

## Backward Compatibility

✅ **Fully backward compatible**
- Existing user addresses in the database continue to work
- Old `addressLine1` format is still supported for reading
- New signups use the improved street + streetNumber structure
- Data is stored in the same `privateData.address` structure

## Related Documentation

- `LOCATION_PREFILL_IMPLEMENTATION.md` - How address data is used in listing creation
- `NEW_SIGNUP_PAGE_README.md` - General signup page documentation

---

**Implementation Date**: November 14, 2025  
**Status**: ✅ Complete  
**Tested**: Pending user testing
