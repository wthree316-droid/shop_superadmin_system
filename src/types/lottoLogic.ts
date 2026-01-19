// src/types/lottoLogic.ts

/**
 * ฟังก์ชันสำหรับแตกตัวเลขตามสูตร (Returns Array of strings)
 * @param number เลขที่ลูกค้ากรอก
 * @param mode รูปแบบ "19gate" | "win2" | "win3" | "normal"
 * @param includeDoubles (Optional) สำหรับโหมดวิน: true = รวมเบิ้ล, false = ไม่รวมเบิ้ล
 */
export const generateNumbers = (
    number: string, 
    mode: '19gate' | 'win2' | 'win3' | 'normal',
    includeDoubles: boolean = false 
): string[] => {
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
    
    // 2. วิน 2 ตัว
    else if (mode === 'win2') {
      const uniqueChars = Array.from(new Set(n.split(''))).slice(0, 8); 
      if (uniqueChars.length < 2) return [];

      for (let i = 0; i < uniqueChars.length; i++) {
        // ถ้าเอาเบิ้ล เริ่ม j ที่ i (จับคู่ตัวเองได้)
        // ถ้าไม่เอาเบิ้ล เริ่ม j ที่ i + 1
        const startJ = includeDoubles ? i : i + 1;
        
        for (let j = startJ; j < uniqueChars.length; j++) {
            result.push(uniqueChars[i] + uniqueChars[j]);
        }
      }
    }
  
    // 3. วิน 3 ตัว
    else if (mode === 'win3') {
      const uniqueChars = Array.from(new Set(n.split(''))).slice(0, 8);
      if (uniqueChars.length < 3) return [];

      for (let i = 0; i < uniqueChars.length; i++) {
        const startJ = includeDoubles ? i : i + 1;
        
        for (let j = startJ; j < uniqueChars.length; j++) {
          const startK = includeDoubles ? j : j + 1;
          
          for (let k = startK; k < uniqueChars.length; k++) {
              result.push(uniqueChars[i] + uniqueChars[j] + uniqueChars[k]);
          }
        }
      }
    }
  
    // 4. ปกติ (ไม่ต้องแตก)
    else {
      result.push(n);
    }
  
    // ตัดเลขซ้ำผลลัพธ์สุดท้าย
    return [...new Set(result)];
};

/**
 * ฟังก์ชันสำหรับกลับเลข (Permutation)
 * รองรับเลข 2 ตัว (ไป-กลับ) และ 3 ตัว (6 กลับ)
 * @param number เลขที่ต้องการกลับ (เช่น "12", "123")
 */
export const generateReturnNumbers = (number: string): string[] => {
    const n = number.trim();
    if (n.length < 2) return [n]; // เลขตัวเดียวไม่ต้องกลับ

    const results: string[] = [];

    // ฟังก์ชัน Recursive สำหรับหา Permutation (ทุกรูปแบบการสลับ)
    const permute = (arr: string[], m: string[] = []) => {
        if (arr.length === 0) {
            results.push(m.join(''));
        } else {
            for (let i = 0; i < arr.length; i++) {
                const curr = arr.slice();
                const next = curr.splice(i, 1);
                permute(curr.slice(), m.concat(next));
            }
        }
    }

    permute(n.split(''));

    // ตัดเลขซ้ำ (เผื่อกรอกเลขเบิ้ลมา เช่น 11 -> จะได้ 11 ตัวเดียว ไม่ใช่ 11, 11)
    return [...new Set(results)];
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

    // 2. เลขพี่น้อง (01, 12...90) -> 10 เลข [แก้ไข: ไม่กลับเลขแล้ว]
    else if (type === 'sibling') {
        const pairs = ['01', '12', '23', '34', '45', '56', '67', '78', '89', '90'];
        // ใส่เฉพาะเลขตรง ไม่ต้องสั่งกลับเลข
        results.push(...pairs);
    }

    // 3. เลขตอง (000-999) -> 10 เลข
    else if (type === 'triple') {
        for (let i = 0; i < 10; i++) {
            results.push(`${i}${i}${i}`);
        }
    }

    // 4. เบิ้ลหน้า (AAX) -> 100 เลข
    else if (type === 'double_front') {
        for (let i = 0; i < 10; i++) { 
            for (let j = 0; j < 10; j++) { 
                if (i !== j) { 
                    results.push(`${i}${i}${j}`);
                }
            }
        }
    }

    // 5. เบิ้ลหลัง (XBB) -> 100 เลข
    else if (type === 'double_back') {
        for (let i = 0; i < 10; i++) { 
            for (let j = 0; j < 10; j++) { 
                if (i !== j) {
                    results.push(`${i}${j}${j}`);
                }
            }
        }
    }

    // 6. เลขหาม (ABA) -> 100 เลข
    else if (type === 'sandwich') {
        for (let i = 0; i < 10; i++) { 
            for (let j = 0; j < 10; j++) { 
                if (i !== j) { 
                    results.push(`${i}${j}${i}`);
                }
            }
        }
    }

    return results;
};