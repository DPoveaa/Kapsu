import fs from 'fs';
import path from 'path';

// Helper for assertions
let passed = 0;
let failed = 0;
const errors = [];

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
    errors.push(name);
  }
}

function runTests() {
  console.log('='.repeat(80));
  console.log('🧪 RUNNING FRONTEND LOCAL OVERRIDES TESTS');
  console.log('='.repeat(80));

  const floatingChatPath = path.resolve('src/components/FloatingChat.tsx');
  if (!fs.existsSync(floatingChatPath)) {
    console.error(`❌ FloatingChat.tsx not found at: ${floatingChatPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(floatingChatPath, 'utf8');

  // Extract functions from FloatingChat.tsx using text slicing
  const extractFunction = (funcName) => {
    const startIndex = content.indexOf(`const ${funcName} =`);
    if (startIndex === -1) {
      throw new Error(`Failed to extract function: ${funcName}`);
    }
    // Find next declaration
    let endIndex = content.indexOf('\nconst ', startIndex + 10);
    if (endIndex === -1 || endIndex > content.indexOf('\ntype ', startIndex + 10)) {
      const typeIndex = content.indexOf('\ntype ', startIndex + 10);
      if (typeIndex !== -1) endIndex = typeIndex;
    }
    if (endIndex === -1) {
      endIndex = content.length;
    }
    return content.slice(startIndex, endIndex);
  };

  // Extract functions
  try {
    const normalizeCommercialSymptomTextCode = extractFunction('normalizeCommercialSymptomText');
    const isHighRiskHealthMessageCode = extractFunction('isHighRiskHealthMessage');
    const shouldAttemptSymptomCommercialFallbackCode = extractFunction('shouldAttemptSymptomCommercialFallback');
    const buildSymptomCommercialQueryCode = extractFunction('buildSymptomCommercialQuery');
    const detectAudienceCorrectionCode = extractFunction('detectAudienceCorrection');
    const isLibidoNeedCode = extractFunction('isLibidoNeed');
    const isShortRecommendationFollowUpCode = extractFunction('isShortRecommendationFollowUp');
    const inferProductTargetAudienceCode = extractFunction('inferProductTargetAudience');
    const scoreAudienceFitCode = extractFunction('scoreAudienceFit');

    // Type-stripping helper to convert extracted TypeScript functions to plain JavaScript
    const cleanTSTypes = (code) => {
      return code
        .replace(/:\s*string/g, '')
        .replace(/:\s*any/g, '')
        .replace(/:\s*AudienceContext\s*\|\s*null/g, '')
        .replace(/:\s*AudienceContext/g, '')
        .replace(/:\s*AudienceGender\s*\|\s*['"]unisex['"]/g, '')
        .replace(/:\s*AudienceGender/g, '')
        .replace(/as\s+any/g, '')
        .replace(/as\s+const/g, '');
    };

    // Create execution context
    const fullCode = `
      // Stub types/contexts
      const createUnknownAudienceContext = () => ({ gender: 'unknown' });
      
      ${cleanTSTypes(normalizeCommercialSymptomTextCode)}
      ${cleanTSTypes(isHighRiskHealthMessageCode)}
      ${cleanTSTypes(shouldAttemptSymptomCommercialFallbackCode)}
      ${cleanTSTypes(buildSymptomCommercialQueryCode)}
      ${cleanTSTypes(detectAudienceCorrectionCode)}
      ${cleanTSTypes(isLibidoNeedCode)}
      ${cleanTSTypes(isShortRecommendationFollowUpCode)}
      ${cleanTSTypes(inferProductTargetAudienceCode)}
      ${cleanTSTypes(scoreAudienceFitCode)}

      // Export functions to global scope
      globalThis.normalizeCommercialSymptomText = normalizeCommercialSymptomText;
      globalThis.isHighRiskHealthMessage = isHighRiskHealthMessage;
      globalThis.shouldAttemptSymptomCommercialFallback = shouldAttemptSymptomCommercialFallback;
      globalThis.buildSymptomCommercialQuery = buildSymptomCommercialQuery;
      globalThis.detectAudienceCorrection = detectAudienceCorrection;
      globalThis.isLibidoNeed = isLibidoNeed;
      globalThis.isShortRecommendationFollowUp = isShortRecommendationFollowUp;
      globalThis.inferProductTargetAudience = inferProductTargetAudience;
      globalThis.scoreAudienceFit = scoreAudienceFit;
    `;

    // Eval in global context
    eval(fullCode);
    console.log('✅ Functions successfully extracted and evaluated.');
  } catch (err) {
    console.error('❌ Failed to extract functions from FloatingChat.tsx:', err.message);
    process.exit(1);
  }

  // Run tests on evaluated functions
  
  // 1. Audience Correction (e.g. "I am a man, not a woman" -> contains both, so let's use explicit "sou homem" or "para homem")
  console.log('\nTesting detectAudienceCorrection...');
  const maleCorrection = globalThis.detectAudienceCorrection("sou homem");
  assert('detectAudienceCorrection("sou homem") extracts gender = male', maleCorrection?.gender === 'male');
  
  const femaleCorrection = globalThis.detectAudienceCorrection("sou mulher");
  assert('detectAudienceCorrection("sou mulher") extracts gender = female', femaleCorrection?.gender === 'female');

  const neutralCorrection = globalThis.detectAudienceCorrection("quero comprar");
  assert('detectAudienceCorrection("quero comprar") returns null', neutralCorrection === null);

  // 2. Libido query detection
  console.log('\nTesting isLibidoNeed...');
  assert('isLibidoNeed("quero produto para libido") returns true', globalThis.isLibidoNeed("quero produto para libido") === true);
  assert('isLibidoNeed("quero emagrecer") returns false', globalThis.isLibidoNeed("quero emagrecer") === false);

  // 3. Short follow-up recommendation
  console.log('\nTesting isShortRecommendationFollowUp...');
  assert('isShortRecommendationFollowUp("sim") returns true', globalThis.isShortRecommendationFollowUp("sim") === true);
  assert('isShortRecommendationFollowUp("não") returns false', globalThis.isShortRecommendationFollowUp("não") === false);

  // 4. Symptom fallback trigger conditions
  console.log('\nTesting shouldAttemptSymptomCommercialFallback...');
  const mockAiClarificationData = {
    parts: [
      { type: 'text', text: 'Como posso te ajudar?' },
      { type: 'actions', actions: [{ type: 'human_support', label: 'Falar com atendente' }] }
    ]
  };
  const mockAiProductData = {
    parts: [
      { type: 'product_cards', products: [{ id: '123', name: 'Product' }] }
    ]
  };

  assert(
    'shouldAttemptSymptomCommercialFallback triggers on commercial symptom + clarification action',
    globalThis.shouldAttemptSymptomCommercialFallback("estou com dor nas pernas", mockAiClarificationData) === true
  );

  assert(
    'shouldAttemptSymptomCommercialFallback does NOT trigger if products were already recommended by AI',
    globalThis.shouldAttemptSymptomCommercialFallback("estou com dor nas pernas", mockAiProductData) === false
  );

  assert(
    'shouldAttemptSymptomCommercialFallback does NOT trigger on high-risk health message (e.g. dor de peito)',
    globalThis.shouldAttemptSymptomCommercialFallback("estou com dor no peito forte", mockAiClarificationData) === false
  );

  // 5. Symptom search query builder
  console.log('\nTesting buildSymptomCommercialQuery...');
  const queryColica = globalThis.buildSymptomCommercialQuery("estou com colica");
  assert('buildSymptomCommercialQuery("estou com colica") builds female health keywords', queryColica.includes('saude feminina') && queryColica.includes('colica'));

  // 6. Product target audience inference
  console.log('\nTesting inferProductTargetAudience...');
  assert(
    'inferProductTargetAudience female product',
    globalThis.inferProductTargetAudience({ name: 'Libido Feminino', category: 'Capsulas' }) === 'female'
  );
  assert(
    'inferProductTargetAudience male product',
    globalThis.inferProductTargetAudience({ description: 'contem tadala para homens' }) === 'male'
  );

  // 7. Audience fit scoring
  console.log('\nTesting scoreAudienceFit...');
  assert('scoreAudienceFit(male, male) is 0.65', globalThis.scoreAudienceFit('male', 'male') === 0.65);
  assert('scoreAudienceFit(female, male) is -1', globalThis.scoreAudienceFit('female', 'male') === -1);

  console.log('\n' + '='.repeat(80));
  console.log(`📊 FRONTEND OVERRIDES RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
