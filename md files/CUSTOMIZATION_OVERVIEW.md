# Sharetribe Template - Customization Overview & Document Guide

Welcome! This document provides a roadmap to understanding and customizing your Sharetribe marketplace template.

## 📚 Documentation Suite

This repository includes **four comprehensive guides** to help you understand and customize the template:

### 1. **COMPREHENSIVE_DEVELOPER_GUIDE.md** 📖
**Read this first!** A complete guide covering:
- Project structure and architecture
- React fundamentals (for beginners)
- Configuration system
- All major pages (ListingPage, EditListingPage, SearchPage, etc.)
- Transaction processes
- State management with Redux
- Styling and theming
- Common customization scenarios
- Development workflow

**Best for**: Understanding the big picture, learning the system, planning major changes

---

### 2. **QUICK_REFERENCE_CHEATSHEET.md** ⚡
**Use this daily!** Quick lookups for:
- File locations
- Code snippets
- Common patterns
- Configuration examples
- SDK methods
- CSS variables
- Commands

**Best for**: Quick reference while coding, finding where things are, copying code patterns

---

### 3. **ARCHITECTURE_VISUAL_GUIDE.md** 🎨
**Visual learner?** Contains:
- Application flow diagrams
- Component hierarchy trees
- Redux data flow
- Transaction process flows
- Filter architecture
- Data entity structures

**Best for**: Understanding how things connect, visualizing data flow, system design

---

### 4. **CUSTOMIZATION_OVERVIEW.md** (This File) 🗺️
**Start here!** Provides:
- Overview of all documentation
- Quick customization roadmap
- Priority-based task list
- FAQ for common scenarios

**Best for**: Getting oriented, planning your customization strategy

---

## 🚀 Quick Start: Your First 30 Minutes

### Step 1: Get the App Running (10 min)
```bash
# Install dependencies
yarn install

# Configure environment
yarn run config
# Enter your marketplace credentials when prompted

# Start development server
yarn run dev
```

Visit `http://localhost:3000` - your marketplace is running!

### Step 2: Explore the App (10 min)
Browse through and identify these pages:
- [ ] Homepage (LandingPage)
- [ ] Search results (SearchPage)
- [ ] Product detail (ListingPage)
- [ ] Create listing flow (EditListingPage)
- [ ] User profile

### Step 3: Make Your First Change (10 min)
Change the primary color:

1. Open `src/config/configBranding.js`
2. Change `marketplaceColor` to your brand color
3. Save and refresh browser

**You've made your first customization!** 🎉

---

## 🎯 Customization Roadmap by Priority

### Phase 1: Branding & Content (Easy - Day 1)
**Files to edit**: `src/config/configBranding.js`, `src/translations/en.json`

- [ ] Change marketplace color
- [ ] Upload your logo
- [ ] Modify text/translations
- [ ] Update footer links
- [ ] Configure social media links

**See**: COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 9 (Styling & Theming)

---

### Phase 2: Business Model (Easy-Medium - Days 2-3)
**Files to edit**: `src/config/configListing.js`, `src/config/configLayout.js`

- [ ] Define your listing type(s)
  - Rental? Product sale? Service inquiry?
- [ ] Choose transaction process
  - `default-booking`, `default-purchase`, `default-inquiry`, or `default-negotiation`
- [ ] Set unit type
  - day, night, hour, item, etc.
- [ ] Choose layout variants
  - Search: map or grid?
  - Listing page: carousel or cover photo?

**See**: COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 4 (Configuration System)

---

### Phase 3: Custom Fields (Medium - Days 4-7)
**Files to edit**: `src/config/configListing.js`

Add fields specific to your marketplace:
- [ ] Define in `listingFields` array
- [ ] Configure for search filtering
- [ ] Add to listing creation form (automatic if configured right!)
- [ ] Display on listing page (automatic!)
- [ ] Set up search schema via Sharetribe CLI

**Example use cases**:
- Rental marketplace: Add "Number of bedrooms", "Amenities"
- Product marketplace: Add "Size", "Color", "Material"
- Service marketplace: Add "Experience level", "Availability"

**See**: 
- COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 6.1 (ListingPage)
- COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 10, Scenario 1

---

### Phase 4: Page Customization (Medium-Hard - Weeks 2-3)
**Files to edit**: `src/containers/*/`

Customize major pages:

#### ListingPage (Product Detail Page)
- [ ] Reorder sections
- [ ] Add custom sections
- [ ] Modify how fields are displayed
- [ ] Customize booking/purchase panel

**See**: COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 6.1

#### EditListingPage (Listing Creation)
- [ ] Add fields to existing panels
- [ ] Add new wizard tabs
- [ ] Remove unnecessary tabs
- [ ] Customize validation

**See**: COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 6.2

#### SearchPage
- [ ] Add/remove filters
- [ ] Customize search results display
- [ ] Modify map behavior
- [ ] Change filter grouping

**See**: COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 6.3

#### LandingPage (Homepage)
- [ ] Edit hero section
- [ ] Add custom sections
- [ ] Feature specific listings
- [ ] Customize call-to-actions

**See**: Console → Design & Content → Pages or edit code in `src/containers/LandingPage/`

---

### Phase 5: Advanced Features (Hard - Month 2+)
**Requires React/Redux knowledge**

- [ ] Custom transaction flows
- [ ] Third-party integrations
- [ ] Custom notifications
- [ ] Advanced filters
- [ ] Multi-currency support
- [ ] Custom user roles
- [ ] Extended analytics

**See**: 
- COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 7 (Transaction Processes)
- COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 8 (Data Flow)
- Official Sharetribe Docs: https://www.sharetribe.com/docs/

---

## 🔧 Most Common Customizations

### Change Marketplace Name
```bash
# .env file
REACT_APP_MARKETPLACE_NAME=My Awesome Marketplace
```

### Add a Custom Listing Field
```javascript
// src/config/configListing.js
export const listingFields = [
  {
    key: 'myField',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'option1', label: 'Option 1' },
      { option: 'option2', label: 'Option 2' }
    ],
    filterConfig: {
      indexForSearch: true,
      label: 'My Field',
      group: 'primary'
    },
    showConfig: { label: 'My Field', isDetail: true },
    saveConfig: { 
      label: 'Select My Field',
      isRequired: true,
      requiredMessage: 'Required'
    }
  }
];
```

Then set search schema:
```bash
flex-cli search set --key myField --type enum --scope public
```

### Customize Transaction Emails
Edit files in:
```
ext/transaction-processes/{process-name}/templates/
```

Then deploy:
```bash
flex-cli process push --process {process-name}
```

### Add a New Static Page
1. Create component: `src/containers/AboutPage/AboutPage.js`
2. Add route in `src/routing/routeConfiguration.js`
3. Add navigation link in Topbar or Footer

**See**: COMPREHENSIVE_DEVELOPER_GUIDE.md → Section 11 (Development Workflow)

---

## 🤔 FAQ: Finding Things

### "Where do I change the homepage?"
- **Via Console**: Design & Content → Pages → Landing Page
- **Via Code**: `src/containers/LandingPage/`

### "Where is the product detail page?"
- **Code**: `src/containers/ListingPage/`
- **Two variants**: ListingPageCoverPhoto.js or ListingPageCarousel.js
- **Choose variant**: `src/config/configLayout.js`

### "Where do I add fields to the listing creation form?"
- **Define field**: `src/config/configListing.js` → `listingFields`
- **It automatically appears** in EditListingPage if configured correctly
- **Manual placement**: `src/containers/EditListingPage/EditListingWizard/`

### "How do I change colors/logo?"
- **Colors**: `src/config/configBranding.js`
- **Logo files**: Add to `src/assets/`, reference in configBranding.js

### "Where are the routes defined?"
- **Route config**: `src/routing/routeConfiguration.js`

### "How do I add a filter to search?"
- **Define field** with `filterConfig` in `src/config/configListing.js`
- **Set search schema** via Sharetribe CLI
- **Filter appears automatically** on SearchPage

### "Where do I edit email templates?"
- **Location**: `ext/transaction-processes/{process}/templates/`
- **Deploy**: Use Sharetribe CLI: `flex-cli process push`

### "How do I change the header/footer?"
- **Header**: `src/containers/TopbarContainer/`
- **Footer**: `src/containers/FooterContainer/`

### "Where is the checkout page?"
- **Code**: `src/containers/CheckoutPage/`

### "How do I modify transaction flow?"
- **Process definitions**: `ext/transaction-processes/`
- **Process logic**: `src/transactions/transaction.js`
- **State handling**: In page components (CheckoutPage, TransactionPage)

---

## 📖 Learning Path Recommendation

### If You're New to React:
1. Read **COMPREHENSIVE_DEVELOPER_GUIDE.md** Section 3 (React Fundamentals)
2. Follow Phase 1-2 of Customization Roadmap
3. Study existing components to understand patterns
4. Make small changes and observe results
5. Progress to Phase 3-4 as you gain confidence

### If You're Experienced with React:
1. Skim **COMPREHENSIVE_DEVELOPER_GUIDE.md** Sections 1-2 (Overview & Structure)
2. Deep dive into Section 6 (Key Pages)
3. Use **QUICK_REFERENCE_CHEATSHEET.md** for syntax
4. Jump to Phase 3-5 based on your needs

### If You're a Visual Learner:
1. Start with **ARCHITECTURE_VISUAL_GUIDE.md**
2. Refer to diagrams while reading code
3. Draw your own diagrams for customizations
4. Use visual tools (Component tree in React DevTools)

---

## 🛠️ Essential Tools

### Development
- **Node.js** (v18+): https://nodejs.org/
- **Yarn**: https://yarnpkg.com/
- **Code Editor**: VS Code (recommended)
- **Git**: Version control

### Browser Extensions
- **React DevTools**: Inspect component hierarchy
- **Redux DevTools**: Monitor state changes
- **Sharetribe Console**: Manage marketplace settings

### Command Line Tools
- **Sharetribe CLI**: Manage processes, search schemas
  ```bash
  npm install -g @sharetribe/flex-cli
  flex-cli login
  ```

---

## 📚 Additional Resources

### Official Documentation
- **Sharetribe Docs**: https://www.sharetribe.com/docs/
- **API Reference**: https://www.sharetribe.com/api-reference/
- **Console**: https://console.sharetribe.com/
- **Developer Slack**: https://www.sharetribe.com/dev-slack

### React Learning
- **React Docs**: https://react.dev/
- **Redux**: https://redux.js.org/
- **React Router**: https://reactrouter.com/

### This Template
- **GitHub**: https://github.com/sharetribe/web-template
- **Issues**: https://github.com/sharetribe/web-template/issues

---

## 🎓 Recommended Reading Order

1. **This file** (CUSTOMIZATION_OVERVIEW.md) ← You are here
2. **COMPREHENSIVE_DEVELOPER_GUIDE.md** - Sections 1-2 (Overview & Structure)
3. **ARCHITECTURE_VISUAL_GUIDE.md** - Application Flow & Component Hierarchy
4. **COMPREHENSIVE_DEVELOPER_GUIDE.md** - Section 4 (Configuration System)
5. **Customization Phase 1-2** (Branding & Business Model)
6. **COMPREHENSIVE_DEVELOPER_GUIDE.md** - Section 6 (Key Pages)
7. **Customization Phase 3-4** (Fields & Pages)
8. **QUICK_REFERENCE_CHEATSHEET.md** - Keep open while coding!

---

## 🚦 Status Check: Am I Ready to Customize?

### ✅ You're ready if you can:
- [ ] Run the app locally (`yarn run dev`)
- [ ] Navigate between pages
- [ ] Identify major components (Topbar, ListingCard, etc.)
- [ ] Find where a page is defined (containers directory)
- [ ] Locate configuration files (config directory)

### 🎯 Next Steps:
1. Follow Phase 1 of Customization Roadmap
2. Make small changes and observe results
3. Use QUICK_REFERENCE_CHEATSHEET.md for syntax help
4. Ask questions in Sharetribe Dev Slack

### ⚠️ Need More Preparation?
- Review React basics: https://react.dev/learn
- Read COMPREHENSIVE_DEVELOPER_GUIDE.md Section 3
- Study existing components in `src/components/`

---

## 💡 Pro Tips

1. **Start small**: Change colors before building new features
2. **Use existing components**: Don't reinvent the wheel
3. **Test frequently**: See changes immediately with `yarn run dev`
4. **Version control**: Commit often, use branches
5. **Read existing code**: Best way to learn the patterns
6. **Use Console first**: Many things configurable without code
7. **Ask for help**: Sharetribe community is friendly and responsive
8. **Plan before coding**: Sketch your changes on paper first
9. **Mobile-first**: Always test on mobile screens
10. **Document your changes**: Future you will thank you

---

## 🎉 You're Ready!

You now have everything you need to customize your Sharetribe marketplace:

✅ Four comprehensive guides  
✅ Clear roadmap for customization  
✅ Quick reference cheatsheet  
✅ Visual architecture diagrams  
✅ FAQ for common questions  

**Now go build something amazing!** 🚀

---

## Need Help?

- **Stuck on something?** → Check QUICK_REFERENCE_CHEATSHEET.md
- **Want to understand a concept?** → Read COMPREHENSIVE_DEVELOPER_GUIDE.md
- **Need to visualize?** → See ARCHITECTURE_VISUAL_GUIDE.md
- **Still stuck?** → Ask in Sharetribe Dev Slack: https://www.sharetribe.com/dev-slack

**Happy customizing!** 🎨
