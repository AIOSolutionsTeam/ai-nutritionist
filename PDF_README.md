# PDF Generation Library

This library provides functionality to generate personalized nutrition plan PDFs using PDFKit.

## Features

- **Personalized Nutrition Plans**: Generate comprehensive PDFs based on user profile data
- **Professional Layout**: Clean, well-structured PDFs with proper formatting
- **User Profile Integration**: Incorporates user age, gender, goals, allergies, and budget
- **Nutritional Recommendations**: Includes daily calorie targets and macronutrient breakdowns
- **Meal Plans**: Detailed breakfast, lunch, dinner, and snack recommendations
- **Hydration Guide**: Water intake recommendations and tips
- **Supplement Recommendations**: Product recommendations with pricing and benefits
- **Personalized Tips**: Custom health and nutrition advice
- **Weekly Goals**: Actionable weekly objectives

## Installation

The required dependencies are already installed:

```bash
npm install pdfkit @types/pdfkit
```

## Usage

### Basic Usage

```typescript
import { pdfGenerator, createSampleNutritionPlan } from "@/lib/pdf";
import { dbService } from "@/lib/db";

// Get user profile from database
const userProfile = await dbService.getUserProfile("user-id");

// Create nutrition plan
const nutritionPlan = createSampleNutritionPlan(userProfile);

// Generate PDF
const pdfUrl = await pdfGenerator.generateNutritionPlanPDF(nutritionPlan);
```

### API Endpoint

Use the `/api/pdf` endpoint to generate PDFs:

```bash
# POST request
curl -X POST http://localhost:3000/api/pdf \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'

# GET request
curl "http://localhost:3000/api/pdf?userId=test-user-123"
```

### Test Page

Visit `/test-pdf` to test the PDF generation functionality with a simple UI.

## File Structure

```
src/lib/pdf.ts          # Main PDF generation library
src/app/api/pdf/route.ts # API endpoint for PDF generation
src/app/test-pdf/page.tsx # Test page for PDF generation
scripts/create-test-user.js # Script to create test user profiles
```

## PDF Content Sections

1. **Header**: Title, user ID, and generation date
2. **User Profile**: Age, gender, goals, allergies, budget
3. **Nutritional Targets**: Daily calories and macronutrient breakdown
4. **Meal Plan**: Breakfast, lunch, dinner, and snack recommendations
5. **Hydration Guide**: Daily water intake and tips
6. **Supplements**: Recommended products with details
7. **Personalized Tips**: Custom health advice
8. **Weekly Goals**: Actionable objectives
9. **Footer**: Branding and generation info

## Configuration

The PDF generator uses a configurable layout system:

```typescript
interface PDFConfig {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  fontSizes: {
    title: number;
    subtitle: number;
    body: number;
    small: number;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    lightGray: string;
    darkGray: string;
  };
}
```

## File Management

- PDFs are saved to the `temp/` directory
- Files are automatically named with user ID and timestamp
- Use `cleanupOldPDFs()` method to remove old files
- Files are accessible via `/temp/filename.pdf` URL

## Testing

1. **Create Test User**:

   ```bash
   npm run create-test-user
   ```

2. **Start Development Server**:

   ```bash
   npm run dev
   ```

3. **Test PDF Generation**:
   - Visit `http://localhost:3000/test-pdf`
   - Enter user ID (default: `test-user-123`)
   - Click "Generate Nutrition Plan PDF"
   - View the generated PDF

## Error Handling

The library includes comprehensive error handling:

- Database connection errors
- User profile not found
- PDF generation failures
- File system errors

## Customization

### Adding New Sections

To add new sections to the PDF:

1. Create a new private method in the `PDFGenerator` class
2. Add the method call to `generateNutritionPlanPDF()`
3. Follow the existing pattern for layout and styling

### Modifying Layout

Update the `PDFConfig` interface and constructor to customize:

- Page dimensions
- Margins
- Font sizes
- Colors
- Spacing

### Adding Custom Data

Extend the `NutritionPlan` interface to include additional data:

```typescript
interface NutritionPlan {
  // ... existing properties
  customSection?: {
    title: string;
    content: string[];
  };
}
```

## Dependencies

- **pdfkit**: PDF generation library
- **@types/pdfkit**: TypeScript definitions
- **fs**: File system operations
- **path**: Path utilities

## Environment Variables

- `MONGODB_URI`: MongoDB connection string (optional, defaults to local)

## Troubleshooting

### Common Issues

1. **PDF not generating**: Check MongoDB connection and user profile existence
2. **File not found**: Ensure `temp/` directory exists and has write permissions
3. **Layout issues**: Verify page dimensions and margin settings
4. **Type errors**: Ensure PDFKit types are properly imported

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=pdf-generator npm run dev
```

## Future Enhancements

- [ ] Add charts and graphs for nutritional data
- [ ] Support for multiple languages
- [ ] Custom branding and logos
- [ ] Interactive PDF elements
- [ ] Batch PDF generation
- [ ] Email integration for PDF delivery
- [ ] PDF templates and themes
- [ ] Image support for meal photos
- [ ] QR codes for quick access
- [ ] Print optimization
