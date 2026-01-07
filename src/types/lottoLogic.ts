// src/types/lottoLogic.ts

/**
 * ฟังก์ชันสำหรับแตกตัวเลขตามสูตร (Returns Array of strings)
 * @param number เลขที่ลูกค้ากรอก (เช่น "5", "123", "12345")
 * @param mode รูปแบบ "19gate" | "win2" | "win3" | "normal"
 */
export const generateNumbers = (number: string, mode: '19gate' | 'win2' | 'win3' | 'normal'): string[] => {
    const n = number.trim();
    const result: string[] = [];
  
    // 1. 19 ประตู (รูดหน้า + รูดหลัง)
    if (mode === '19gate') {
      if (n.length !== 1) return []; // ต้องเลขตัวเดียว
      for (let i = 0; i < 100; i++) {
        const s = i.toString().padStart(2, '0');
        if (s.includes(n)) result.push(s);
      }
    }
    
    // 2. วิน 2 ตัว (จับคู่ 2 ไม่รวมเบิ้ล)
    else if (mode === 'win2') {
      // ตัดเลขซ้ำออกก่อน และจำกัดความยาวเพื่อประสิทธิภาพ
      const uniqueChars = Array.from(new Set(n.split(''))).slice(0, 8); 
      if (uniqueChars.length < 2) return [];

      for (let i = 0; i < uniqueChars.length; i++) {
        for (let j = 0; j < uniqueChars.length; j++) {
          if (i !== j) result.push(uniqueChars[i] + uniqueChars[j]);
        }
      }
    }
  
    // 3. วิน 3 ตัว (จับคู่ 3 ไม่รวมหาม/ตอง)
    else if (mode === 'win3') {
      const uniqueChars = Array.from(new Set(n.split(''))).slice(0, 8);
      if (uniqueChars.length < 3) return [];

      for (let i = 0; i < uniqueChars.length; i++) {
        for (let j = 0; j < uniqueChars.length; j++) {
          for (let k = 0; k < uniqueChars.length; k++) {
            // ต้องไม่มีตำแหน่งซ้ำกันเลย
            if (i !== j && i !== k && j !== k) {
              result.push(uniqueChars[i] + uniqueChars[j] + uniqueChars[k]);
            }
          }
        }
      }
    }
  
    // 4. ปกติ (ไม่ต้องแตก)
    else {
      result.push(n);
    }
  
    // ตัดเลขซ้ำผลลัพธ์สุดท้าย (Unique)
    return [...new Set(result)];
};

/**
 * ฟังก์ชันสร้างเลขชุดพิเศษ (กดปุ่มแล้วได้เลขเลย)
 * @param type ประเภทเลขชุด
 */
export const generateSpecialNumbers = (type: 'double' | 'sibling' | 'triple' | 'double_front' | 'double_back' | 'sandwich'): string[] => {
    const results: string[] = [];

    // 1. เลขเบิ้ล (00-99) -> 10 เลข
    if (type === 'double') {
        for (let i = 0; i < 10; i++) {
            results.push(`${i}${i}`);
        }
    }

    // 2. เลขพี่น้อง (01, 12...90 และกลับด้วย) -> 20 เลข
    else if (type === 'sibling') {
        // คู่พี่น้อง: 01, 12, 23, 34, 45, 56, 67, 78, 89, 90
        const pairs = ['01', '12', '23', '34', '45', '56', '67', '78', '89', '90'];
        pairs.forEach(p => {
            results.push(p); // ตรง
            results.push(p.split('').reverse().join('')); // กลับ
        });
    }

    // 3. เลขตอง (000-999) -> 10 เลข
    else if (type === 'triple') {
        for (let i = 0; i < 10; i++) {
            results.push(`${i}${i}${i}`);
        }
    }

    // 4. เบิ้ลหน้า (AAX) -> 100 เลข
    else if (type === 'double_front') {
        for (let i = 0; i < 10; i++) { // หน้า (เบิ้ล)
            for (let j = 0; j < 10; j++) { // หลัง
                results.push(`${i}${i}${j}`);
            }
        }
    }

    // 5. เบิ้ลหลัง (XBB) -> 100 เลข
    else if (type === 'double_back') {
        for (let i = 0; i < 10; i++) { // หน้า
            for (let j = 0; j < 10; j++) { // หลัง (เบิ้ล)
                results.push(`${i}${j}${j}`);
            }
        }
    }

    // 6. เลขหาม (ABA) -> 100 เลข
    else if (type === 'sandwich') {
        for (let i = 0; i < 10; i++) { // ริม
            for (let j = 0; j < 10; j++) { // กลาง
                results.push(`${i}${j}${i}`);
            }
        }
    }

    return results;
};