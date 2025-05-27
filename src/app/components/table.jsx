import React, { useState, useEffect, useMemo } from 'react';

// Función para generar código Gray
const generateGrayCode = (n) => {
  if (n === 0) return [''];
  const prev = generateGrayCode(n - 1);
  return [
    ...prev.map(code => '0' + code),
    ...prev.reverse().map(code => '1' + code)
  ];
};

// Función corregida para encontrar grupos
const findAllGroups = (dataMap, rowHeaders, colHeaders) => {
  const rows = rowHeaders.length;
  const cols = colHeaders.length;
  const covered = new Set();
  const groups = [];

  // Verificar si TODAS las celdas son '1' o 'X' (ningún '0')
  const allOnesOrDontCare = rowHeaders.every(row =>
    colHeaders.every(col => {
      const val = dataMap[row]?.[col];
      return val === '1' || val === 'X';
    })
  );

  if (allOnesOrDontCare) {
    const fullGroup = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        fullGroup.push([r, c]);
      }
    }
    return [fullGroup];
  }

  const isCellIncludable = (r, c) => {
    const row = rowHeaders[r];
    const col = colHeaders[c];
    return dataMap[row]?.[col] === '1' || dataMap[row]?.[col] === 'X';
  };

  // Generar todos los grupos posibles ordenados por tamaño descendente
  const possibleGroups = [];
  
  for (let sizeR = rows; sizeR >= 1; sizeR >>= 1) {
    for (let sizeC = cols; sizeC >= 1; sizeC >>= 1) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const group = [];
          for (let dr = 0; dr < sizeR; dr++) {
            for (let dc = 0; dc < sizeC; dc++) {
              const cellR = (r + dr) % rows;
              const cellC = (c + dc) % cols;
              group.push([cellR, cellC]);
            }
          }
          possibleGroups.push(group);
        }
      }
    }
  }

  possibleGroups.sort((a, b) => {
    const sizeDiff = b.length - a.length;
    if (sizeDiff !== 0) return sizeDiff;
    
    const countA = a.filter(([r, c]) => 
      dataMap[rowHeaders[r]][colHeaders[c]] === '1' && !covered.has(`${r},${c}`)
    ).length;
    
    const countB = b.filter(([r, c]) => 
      dataMap[rowHeaders[r]][colHeaders[c]] === '1' && !covered.has(`${r},${c}`)
    ).length;
    
    return countB - countA;
  });

  for (const group of possibleGroups) {
    const isValid = group.every(([r, c]) => isCellIncludable(r, c));
    if (!isValid) continue;
    
    const coversNew = group.some(([r, c]) => 
      dataMap[rowHeaders[r]][colHeaders[c]] === '1' && !covered.has(`${r},${c}`)
    );
    
    if (coversNew) {
      groups.push(group);
      group.forEach(([r, c]) => {
        if (dataMap[rowHeaders[r]][colHeaders[c]] === '1') {
          covered.add(`${r},${c}`);
        }
      });
    }
  }

  return groups;
};

// Función mejorada para encontrar implicantes primos con pasos detallados
const findPrimeImplicants = (dataMap, rowHeaders, colHeaders, variables) => {
  // 1. Validación inicial de parámetros
  if (!dataMap || !rowHeaders || !colHeaders || !variables) {
    return {
      steps: [],
      primes: [],
      essential: [],
      error: "Parámetros inválidos"
    };
  }

  // 2. Extracción de minterms y don't cares con validación
  const minterms = [];
  const dontCares = [];
  
  try {
    rowHeaders.forEach((row) => {
      colHeaders.forEach((col) => {
        const value = dataMap[row]?.[col];
        if (value === '1') minterms.push(row + col);
        else if (value === 'X') dontCares.push(row + col);
      });
    });
  } catch (error) {
    return {
      steps: [],
      primes: [],
      essential: [],
      error: "Error al procesar el mapa de datos"
    };
  }

  // 3. Caso especial: sin minterms
  if (minterms.length === 0) {
    return {
      steps: [{
        title: "Paso 1: Agrupación inicial",
        groups: {},
        note: "No se encontraron minterms"
      }],
      primes: [],
      essential: []
    };
  }

  // 4. Función auxiliar segura
  const countOnes = (binary) => {
    if (typeof binary !== 'string') return 0;
    return binary.split('').filter(b => b === '1').length;
  };

  // 5. Paso 1: Agrupación inicial con estructura garantizada
  const steps = [];
  let groups = {};

  try {
    [...minterms, ...dontCares].forEach(term => {
      const ones = countOnes(term);
      if (!groups[ones]) groups[ones] = [];
      groups[ones].push(term);
    });

    steps.push({
      title: "Paso 1: Agrupación inicial por número de unos",
      groups: JSON.parse(JSON.stringify(groups)),
      note: Object.keys(groups).length > 0 ? 
        `${minterms.length} minterms y ${dontCares.length} don't cares agrupados` :
        "No se pudieron formar grupos iniciales"
    });
  } catch (error) {
    return {
      steps: [{
        title: "Error en agrupación inicial",
        error: error.message
      }],
      primes: [],
      essential: []
    };
  }

  // 6. Paso 2: Combinación de términos con manejo seguro
  let primeImplicants = new Set();
  let iteration = 1;

  try {
    let foundNew = true;
    while (foundNew) {
      foundNew = false;
      const newGroups = {};
      const used = new Set();
      const combinations = [];

      const groupKeys = Object.keys(groups).sort((a, b) => a - b);
      
      for (let i = 0; i < groupKeys.length - 1; i++) {
        const ones1 = groupKeys[i];
        const ones2 = groupKeys[i + 1];
        
        if (parseInt(ones2) - parseInt(ones1) !== 1) continue;

        for (const term1 of groups[ones1] || []) {
          for (const term2 of groups[ones2] || []) {
            let diff = 0;
            let combined = '';
            
            for (let k = 0; k < term1.length; k++) {
              if (term1[k] !== term2[k]) {
                diff++;
                combined += '-';
              } else {
                combined += term1[k];
              }
            }
            
            if (diff === 1) {
              const newOnes = countOnes(combined);
              if (!newGroups[newOnes]) newGroups[newOnes] = new Set();
              newGroups[newOnes].add(combined);
              used.add(term1);
              used.add(term2);
              foundNew = true;

              combinations.push({
                group: `${ones1}-${ones2}`,
                pairs: [[parseInt(term1, 2), parseInt(term2, 2)]],
                implicant: combined,
                used: true
              });
            }
          }
        }
      }

      // Agregar términos no usados como implicantes primos
      Object.values(groups).flat().forEach(term => {
        if (!used.has(term)) primeImplicants.add(term);
      });

      // Registrar paso si hubo combinaciones
      if (foundNew) {
        steps.push({
          title: `Paso 2.${iteration}: Combinación de términos`,
          combinations: [...combinations],
          groups: Object.fromEntries(
            Object.entries(newGroups).map(([k, v]) => [k, Array.from(v)])
          ),
          note: `Se combinaron ${combinations.length} pares de términos`
        });
        iteration++;
      }

      // Preparar para siguiente iteración
      groups = Object.fromEntries(
        Object.entries(newGroups).map(([k, v]) => [k, Array.from(v)])
      );
    }
  } catch (error) {
    steps.push({
      title: "Error en combinación de términos",
      error: error.message
    });
  }

  // 7. Paso 3: Tabla de cobertura con validación
  const essentialImplicants = [];
  const coverageTable = [];

  try {
    const coveredMinterms = new Set();
    const primeArray = [...primeImplicants].sort((a, b) => {
      return b.split('-').length - a.split('-').length;
    });

    for (const implicant of primeArray) {
      const covering = new Set();
      
      for (const minterm of minterms) {
        let match = true;
        for (let i = 0; i < minterm.length; i++) {
          if (implicant[i] !== '-' && implicant[i] !== minterm[i]) {
            match = false;
            break;
          }
        }
        if (match) covering.add(minterm);
      }

      const isEssential = [...covering].some(m => !coveredMinterms.has(m));
      coverageTable.push({ implicant, covers: [...covering], isEssential });

      if (isEssential) {
        essentialImplicants.push(implicant);
        covering.forEach(m => coveredMinterms.add(m));
      }
    }

    steps.push({
      title: "Paso 3: Tabla de cobertura",
      coverageTable,
      essential: essentialImplicants.map(imp => 
        imp.split('').map((bit, i) => 
          bit === '-' ? null : `${variables[i]}${bit === '0' ? "'" : ''}`
        ).filter(Boolean).join('')
      ),
      note: `Encontrados ${essentialImplicants.length} implicantes esenciales`
    });
  } catch (error) {
    steps.push({
      title: "Error en tabla de cobertura",
      error: error.message
    });
  }

  // 8. Resultado final con transformación segura
  try {
    return {
      steps,
      primes: [...primeImplicants].map(imp => 
        imp.split('').map((bit, i) => 
          bit === '-' ? null : `${variables[i]}${bit === '0' ? "'" : ''}`
        ).filter(Boolean).join('')
      ),
      essential: essentialImplicants.map(imp => 
        imp.split('').map((bit, i) => 
          bit === '-' ? null : `${variables[i]}${bit === '0' ? "'" : ''}`
        ).filter(Boolean).join('')
      )
    };
  } catch (error) {
    return {
      steps,
      primes: [],
      essential: [],
      error: "Error al generar expresión final"
    };
  }
};

// Función para mapear grupos a términos de la expresión
const groupsToExpression = (groups, rowHeaders, colHeaders, variables) => {
  const rowBits = rowHeaders[0].length;
  const colBits = colHeaders[0].length;
  const totalBits = rowBits + colBits;
  
  return groups.map(group => {
    const terms = group.map(([r, c]) => rowHeaders[r] + colHeaders[c]);
    
    const commonBits = [];
    for (let i = 0; i < totalBits; i++) {
      const bits = new Set(terms.map(term => term[i]));
      if (bits.size === 1) {
        const bit = [...bits][0];
        commonBits.push({
          index: i,
          value: bit
        });
      }
    }
    
    return commonBits.map(({index, value}) => {
      const varName = variables[index];
      return value === '0' ? `${varName}'` : varName;
    }).join('');
  });
};

export const TableK = ({ variables = [] }) => {
  const n = variables.length;
  const rowBits = Math.max(1, Math.floor(n / 2));
  const colBits = Math.max(1, n - rowBits);

  const rowHeaders = useMemo(() => generateGrayCode(rowBits), [rowBits]);
  const colHeaders = useMemo(() => generateGrayCode(colBits), [colBits]);

  const [dataMap, setDataMap] = useState(() => {
    const initialData = {};
    rowHeaders.forEach(r => {
      initialData[r] = {};
      colHeaders.forEach(c => {
        initialData[r][c] = '0';
      });
    });
    return initialData;
  });

  const [groups, setGroups] = useState([]);
  const [primeImplicants, setPrimeImplicants] = useState({
    steps: [],
    primes: [],
    essential: []
  });
  const [showQuineMcCluskey, setShowQuineMcCluskey] = useState(false);

  useEffect(() => {
    const newDataMap = {};
    rowHeaders.forEach(r => {
      newDataMap[r] = {};
      colHeaders.forEach(c => {
        newDataMap[r][c] = dataMap[r]?.[c] || '0';
      });
    });
    setDataMap(newDataMap);
  }, [variables, rowHeaders, colHeaders]);

  useEffect(() => {
    if (n >= 2 && Object.keys(dataMap).length > 0) {
      try {
        // 1. Calcular grupos visuales óptimos
        const detectedGroups = findAllGroups(dataMap, rowHeaders, colHeaders);
        setGroups(detectedGroups);
        
        // 2. Calcular expresión a partir de grupos visuales
        const visualExpression = groupsToExpression(detectedGroups, rowHeaders, colHeaders, variables);
        
        // 3. Calcular con Quine-McCluskey para comparar
        const qmResults = findPrimeImplicants(dataMap, rowHeaders, colHeaders, variables);
        setPrimeImplicants(qmResults);
        
      } catch (error) {
        console.error("Error in calculations:", error);
        setGroups([]);
        setPrimeImplicants({ steps: [], primes: [], essential: [] });
      }
    }
  }, [dataMap, variables, rowHeaders, colHeaders]);

  const handleCellClick = (row, col) => {
    setDataMap(prev => ({
      ...prev,
      [row]: {
        ...prev[row],
        [col]: prev[row][col] === '0' ? '1' : 
               prev[row][col] === '1' ? 'X' : '0'
      }
    }));
  };

  const groupColors = [
    '#2eb1ed', '#cc3a3b', '#1fc586', 
    '#ec9412', '#fb839e', '#FFD700'
  ];

  const getSimplifiedExpression = () => {
    const noZeros = rowHeaders.every(row =>
      colHeaders.every(col => {
        const val = dataMap[row]?.[col];
        return val === '1' || val === 'X';
      })
    );

    if (noZeros) return "F = 1";
    if (primeImplicants.essential.length === 0) return "F = 0";
    return `F = ${primeImplicants.essential.join(' + ')}`;
  };

  if (n === 0 || n === 1) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#0d6efd',
        border: '1px solid #0d6efd',
        borderRadius: '4px',
        margin: '20px',
        textAlign: 'center'
      }}>
        <h3>Mapa de Karnaugh no disponible</h3>
        <p>{n === 0 ? 'No hay variables definidas' : 'Se requiere un mínimo de 2 variables'}</p>
      </div>
    );
  }
  
  return (
    <div>
      <h2>Mapa de Karnaugh</h2>
      <p>Variables: {variables.join(", ")}</p>
  <div style={{
  maxWidth: '500px',
  margin: '0 auto',
  padding: '10px',
  display: 'flex',
  justifyContent: 'center'
}}>
  <div style={{ width: '100%', maxWidth: '650px' }}>
    <table style={{  
      borderCollapse: 'collapse',
      width: '100%',
      backgroundColor: '#111827',
      color: '#e5e7eb',
      fontFamily: 'sans-serif',
      boxShadow: '0 0 15px rgba(0,0,0,0.2)',
      borderRadius: '12px',
      overflow: 'hidden',
      tableLayout: 'fixed'
    }}>
      <thead>
        <tr>
          {/* Aquí ponemos el título dividido de variables */}
          <th style={{
            width: 48,
            height: 48,
            backgroundColor: 'transparent',
            border: 'none',
            fontWeight: '600',
            fontSize: '14px',
            color: '#9ca3af',
            textAlign: 'center',
            padding: 0,
            userSelect: 'none',
            lineHeight: '48px'
          }}>
            {variables.slice(0, rowBits).join('')}/{variables.slice(rowBits).join('')}
          </th>

          {colHeaders.map(col => (
            <th key={col} style={{
              width: 48,
              height: 48,
              textAlign: 'center',
              backgroundColor: '#1f2937',
              fontWeight: 600,
              fontSize: '14px',
              borderBottom: '1px solid #374151',
              borderRight: '1px solid #374151'
            }}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowHeaders.map((row, ri) => (
          <tr key={row}>
            <th style={{
              width: 48,
              height: 48,
              textAlign: 'center',
              backgroundColor: '#1f2937',
              fontWeight: 600,
              fontSize: '14px',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              borderBottom: '1px solid #374151',
              borderRight: '1px solid #374151'
            }}>
              {row}
            </th>
            {colHeaders.map((col, ci) => {
              const inGroup = groups.findIndex(g => g.some(([r, c]) => r === ri && c === ci));
              const value = dataMap[row]?.[col] || '0';
              const position = parseInt(row + col, 2);

              const isCorner = 
                (ri === 0 && ci === 0) ||
                (ri === 0 && ci === colHeaders.length - 1) ||
                (ri === rowHeaders.length - 1 && ci === 0) ||
                (ri === rowHeaders.length - 1 && ci === colHeaders.length - 1);

              return (
                <td
                  key={col}
                  onClick={() => handleCellClick(row, col)}
                  style={{
                    width: 48,
                    height: 48,
                    cursor: 'pointer',
                    backgroundColor: inGroup >= 0 ? `${groupColors[inGroup % groupColors.length]}33` : '#111827',
                    color: value === '0' ? '#6b7280' : '#f9fafb',
                    fontWeight: value === 'X' ? 'bold' : 'normal',
                    textAlign: 'center',
                    position: 'relative',
                    fontSize: '18px',
                    borderBottom: '1px solid #374151',
                    borderRight: '1px solid #374151',
                    ...(isCorner && inGroup >= 0 && {
                      borderRadius:
                        ri === 0 && ci === 0 ? '8px 0 0 0' :
                        ri === 0 && ci === colHeaders.length - 1 ? '0 8px 0 0' :
                        ri === rowHeaders.length - 1 && ci === 0 ? '0 0 0 8px' :
                        '0 0 8px 0',
                      borderColor: groupColors[inGroup % groupColors.length]
                    })
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    left: 4,
                    fontSize: '10px',
                    color: '#9ca3af'
                  }}>
                    {position}
                  </span>
                  <span style={{
                    fontWeight: value === '1' || value === 'X' ? 'bold' : 'normal',
                    fontStyle: value === 'X' ? 'italic' : 'normal'
                  }}>
                    {value}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>


      <div style={{
        overflowY: "auto",
        margin: "10px 0",
        border: "1px solid #444",
        borderRadius: "5px",
        padding: "10px",
        backgroundColor: "#1f2937"
      }}>
        <h3 style={{ marginTop: 0 }}>Grupos detectados:</h3>
        <ul style={{
          listStyle: "none",
          paddingLeft: "10px",
          margin: 0
        }}>
          {groups.map((group, i) => {
            const sorted = [...group]
              .sort(([r1, c1], [r2, c2]) => r2 - r1 || c1 - c2)
              .map(([r, c]) => `${rowHeaders[r]}${colHeaders[c]}`);

            return (
              <li 
                key={i} 
                style={{ 
                  color: groupColors[i % groupColors.length],
                  margin: "5px 0",
                  fontFamily: "monospace"
                }}
              >
                <strong>Grupo {i+1}:</strong> {group.length} celdas → [
                {sorted.join(", ")}
                ]
              </li>
            );
          })}
        </ul>
      </div>

      <div style={{
  margin: '20px 0',
  border: '1px solid #444',
  borderRadius: '5px',
  padding: '15px',
  backgroundColor: '#1f2937'
}}>
  <h3>Expresión Simplificada:</h3>
  <p style={{ 
    fontSize: '1.2em', 
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#1fc586',
    padding: '8px',
    backgroundColor: '#1fc58620',
    borderRadius: '4px'
  }}>
    {getSimplifiedExpression()}
  </p>
</div>

<div style={{ margin: '20px 0' }}>
  <button 
    onClick={() => setShowQuineMcCluskey(!showQuineMcCluskey)}
    style={{
      padding: '8px 16px',
      backgroundColor: showQuineMcCluskey ? '#cc3a3b' : '#0d6efd',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.3s ease'
    }}
  >
    {showQuineMcCluskey ? 'Ocultar Detalles del Algoritmo' : 'Mostrar Paso a Paso Quine-McCluskey'}
  </button>
</div>

{showQuineMcCluskey && (
  <div style={{
    margin: '20px 0',
    border: '1px solid #444',
    borderRadius: '5px',
    padding: '15px',
    backgroundColor: '#1f2937'
  }}>
    <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>Método de Quine-McCluskey</h3>
    
    {/* Paso 1: Agrupación inicial */}
    <div style={{ marginBottom: '25px' }}>
      <h4 style={{ color: '#0d6efd', marginBottom: '15px' }}>1. Min términos y sus representaciones binarias</h4>
      
      {Object.entries(primeImplicants.steps[0]?.groups || {}).map(([onesCount, terms]) => (
        <div key={onesCount} style={{ 
          marginBottom: '15px',
          backgroundColor: '#111827',
          padding: '10px',
          borderRadius: '5px'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px',
            paddingBottom: '5px',
            borderBottom: '1px solid #374151'
          }}>
            <span style={{ 
              backgroundColor: '#0d6efd',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '10px'
            }}>
              {onesCount}
            </span>
            <strong>Grupo A{parseInt(onesCount)+1}</strong>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
            {terms.map((term, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#374151',
                padding: '5px 10px',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}>
                <span style={{ marginRight: '8px' }}>→</span>
                <span>{parseInt(term, 2)}</span>
                <span style={{ margin: '0 5px', color: '#9CA3AF' }}>|</span>
                <span>{term}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

{/* Paso 2: Combinación de términos - Versión corregida */}
{primeImplicants.steps.filter(step => step.title.includes("Paso 2")).map((step, stepIndex) => (
  <div key={stepIndex} style={{ marginBottom: '25px' }}>
    <h4 style={{ 
      color: '#0d6efd', 
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'center'
    }}>
      <span style={{
        backgroundColor: '#0d6efd',
        color: 'white',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '10px'
      }}>
        {stepIndex + 2}
      </span>
      {step.title}
    </h4>

    {step.combinations?.length > 0 && (
      <>
        <div style={{
          backgroundColor: '#111827',
          padding: '15px',
          borderRadius: '5px',
          overflowX: 'auto',
          marginBottom: '15px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'monospace'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#374151' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Grupos Combinados</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Términos</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Implicante</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {step.combinations.map((combo, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #374151' }}>
                  <td style={{ padding: '10px' }}>{combo.group}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>
                    {combo.pairs.map(pair => `(${pair.join(', ')})`).join(', ')}
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>{combo.implicant}</td>
                  <td style={{ 
                    padding: '10px',
                    color: combo.used ? '#1fc586' : '#f87171',
                    fontWeight: 'bold'
                  }}>
                    {combo.used ? '✓' : '✗'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ 
          padding: '10px',
          backgroundColor: '#1fc58620',
          borderRadius: '4px',
          borderLeft: '3px solid #1fc586',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ color: '#1fc586', marginRight: '8px' }}>✓</span>
          <span style={{ fontSize: '0.9em' }}>
            {step.combinations.filter(c => c.used).length > 0
              ? `Se encontraron ${step.combinations.filter(c => c.used).length} combinaciones válidas`
              : 'No se encontraron combinaciones en este paso'}
          </span>
        </div>
      </>
    )}

    {Object.keys(step.groups || {}).length > 0 && (
      <div style={{ marginTop: '15px' }}>
        <h5 style={{ color: '#9CA3AF', marginBottom: '10px' }}>Nuevos grupos formados:</h5>
        {Object.entries(step.groups).map(([onesCount, terms]) => (
          <div key={onesCount} style={{ 
            marginBottom: '10px',
            backgroundColor: '#111827',
            padding: '10px',
            borderRadius: '5px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              <span style={{ 
                backgroundColor: '#0d6efd',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px',
                fontSize: '0.8em'
              }}>
                {onesCount}
              </span>
              <strong>Grupo con {onesCount} unos</strong>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {terms.map((term, i) => (
                <div key={i} style={{
                  padding: '3px 8px',
                  backgroundColor: '#374151',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  fontSize: '0.9em'
                }}>
                  {term}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
))}
    {/* Paso 3: Tabla de Cobertura - Versión corregida con validaciones */}
{primeImplicants.steps[primeImplicants.steps.length-1]?.coverageTable && (
  <div style={{ marginBottom: '25px' }}>
    <h4 style={{ 
      color: '#0d6efd', 
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'center'
    }}>
      <span style={{
        backgroundColor: '#0d6efd',
        color: 'white',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '10px'
      }}>
        3
      </span>
      Tabla de Cobertura - Identificar Implicantes Esenciales
    </h4>

    {/* Resumen de Implicantes Primos */}
    <div style={{ 
      backgroundColor: '#111827',
      padding: '15px',
      borderRadius: '5px',
      marginBottom: '15px'
    }}>
      <h5 style={{ marginBottom: '10px', color: '#9CA3AF' }}>Resumen de Implicantes Primos:</h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {primeImplicants.steps[primeImplicants.steps.length-1].coverageTable.map((row, i) => (
          <div key={i} style={{
            padding: '8px 12px',
            backgroundColor: row.isEssential ? '#1fc58630' : '#0d6efd30',
            borderRadius: '4px',
            border: `1px solid ${row.isEssential ? '#1fc586' : '#0d6efd'}`,
            fontFamily: 'monospace'
          }}>
            {row.implicant} ({row.covers.map(mt => parseInt(mt, 2)).join(', ')})
            {row.isEssential && (
              <span style={{ marginLeft: '8px', color: '#1fc586' }}>✓ Esencial</span>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Tabla de cobertura con validaciones */}
    <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
      <table style={{ 
        borderCollapse: 'collapse', 
        width: '100%',
        backgroundColor: '#111827'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#374151' }}>
            <th style={{ padding: '8px', border: '1px solid #444' }}>Implicantes</th>
            {/* Obtener minterms de forma segura */}
            {(() => {
              const initialStep = primeImplicants.steps[0];
              if (!initialStep?.groups) return null;
              
              // Obtener todos los minterms de todos los grupos
              const allMinterms = Object.values(initialStep.groups).flat();
              const uniqueMinterms = [...new Set(allMinterms)];
              
              return uniqueMinterms.map(minterm => (
                <th key={minterm} style={{ padding: '8px', border: '1px solid #444' }}>
                  {parseInt(minterm, 2)}
                </th>
              ));
            })()}
            <th style={{ padding: '8px', border: '1px solid #444' }}>Expresión</th>
          </tr>
        </thead>
        <tbody>
          {primeImplicants.steps[primeImplicants.steps.length-1].coverageTable.map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#1f2937' : '#111827' }}>
              <td style={{ 
                padding: '8px',
                border: '1px solid #444',
                fontFamily: 'monospace'
              }}>
                {row.implicant}
              </td>
              {/* Mismo método seguro para obtener minterms */}
              {(() => {
                const initialStep = primeImplicants.steps[0];
                if (!initialStep?.groups) return null;
                
                const allMinterms = Object.values(initialStep.groups).flat();
                const uniqueMinterms = [...new Set(allMinterms)];
                
                return uniqueMinterms.map(minterm => (
                  <td key={minterm} style={{ 
                    padding: '8px',
                    border: '1px solid #444',
                    textAlign: 'center',
                    backgroundColor: row.covers.includes(minterm) ? 
                      (row.isEssential ? '#1fc58630' : '#0d6efd30') : 'transparent'
                  }}>
                    {row.covers.includes(minterm) ? 'X' : ''}
                  </td>
                ));
              })()}
              <td style={{ 
                padding: '8px',
                border: '1px solid #444',
                fontFamily: 'monospace'
              }}>
                {row.implicant.split('').map((bit, i) => 
                  bit === '-' ? null : variables[i] + (bit === '0' ? "'" : '')
                ).filter(Boolean).join('')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

     {/* Resultado final */}
    <div style={{ 
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#1fc58620',
      borderRadius: '5px',
      borderLeft: '4px solid #1fc586'
    }}>
      <h4 style={{ color: '#1fc586', marginBottom: '10px' }}>Expresión Simplificada Final</h4>
      <div style={{
        padding: '10px',
        backgroundColor: '#1f2937',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '1.2em',
        fontWeight: 'bold'
      }}>
        F = {primeImplicants.essential.join(' + ')}
      </div>
    </div>
  </div>
)}

    </div>
  );
};
