/**
 * Reusable pieces of C syntax supported by Pointer Slayer.
 */

const IDENTIFIER = "[A-Za-z_][A-Za-z0-9_]*";
const INTEGER_LITERAL = "[+-]?\\d+";

/**
 * Regex patterns for every statement supported by the MVP.
 *
 * Identifier captures describe syntax, not validated variable types:
 * - name: the identifier being declared or directly assigned, including pointers.
 * - pointerName: the identifier dereferenced on the left side (*p = or **pp =).
 * - target: the variable whose address is taken with &.
 * - sourceName: any other right-hand identifier, including after * or **.
 * Numeric literals use value or initialValue.
 * The surrounding pattern determines whether a source is dereferenced.
 *
 * Supported:
 *
 * int x;
 * int x = 5;
 *
 * int *p;
 * int *p = &x;
 *
 * x = 10;
 * p = &x;
 * *p = 20;
 */

export const PARSER_PATTERNS = {
  /**
   * int x;
   * int x = 5;
   * int number = -10;
   */
  variableDeclaration: new RegExp(
    `^\\s*int\\s+(?<name>${IDENTIFIER})` +
      `(?:\\s*=\\s*(?<initialValue>${INTEGER_LITERAL}))?` +
      `\\s*;\\s*$`,
  ),

  /**
   * int x = y; 
   */
  variableCopyDeclaration: new RegExp(
    `^\\s*int\\s+(?<name>${IDENTIFIER})` +
      `(?:\\s*=\\s*(?<sourceName>${IDENTIFIER}))?` +
      `\\s*;\\s*$`,
  ),

  /**
   * int *p;
   * int* p;
   * int * p;
   * int *p = &x;
   */
  pointerDeclaration: new RegExp(
    `^\\s*int\\s*\\*\\s*(?<name>${IDENTIFIER})` +
      `(?:\\s*=\\s*&\\s*(?<target>${IDENTIFIER}))?` +
      `\\s*;\\s*$`,
  ),

  /**
   * int *p = q;
   */
  pointerCopyDeclaration: new RegExp(
    `^\\s*int\\s*\\*\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

  /**
   * x = 10;
   * x = -5;
   */
  variableAssignment: new RegExp(
    `^\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*(?<value>${INTEGER_LITERAL})` +
      `\\s*;\\s*$`,
  ),

  /**
   * x = y;
   */
  variableCopyAssignment: new RegExp(
    `^\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),


  /**
   * p = &x;
   */
  pointerAssignment: new RegExp(
    `^\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*&\\s*(?<target>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),
  
  /**
   * *p = 20;
   */
  dereferenceAssignment: new RegExp(
    `^\\s*\\*\\s*(?<pointerName>${IDENTIFIER})` +
      `\\s*=\\s*(?<value>${INTEGER_LITERAL})` +
      `\\s*;\\s*$`,
  ),

  /**
   * p = q;
   */
  pointerCopyAssignment: new RegExp(
    `^\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),
  



  // DOUBLE POINTER PART // 
  //how to make sure p,q is pointer 

  // INITIALIZATION OF DOUBLE POINTERS
  /**
   * int **pp = &p; 
   */
  doublePointerDeclarationV1: new RegExp(
    `^\\s*int\\s*\\*\\s*\\*\\s*(?<name>${IDENTIFIER})` +
      `(?:\\s*=\\s*&\\s*(?<target>${IDENTIFIER}))?` +
      `\\s*;\\s*$`,
  ),

  /**
   * int **pp = qq; 
   */
  doublePointerDeclarationV2: new RegExp(
    `^\\s*int\\s*\\*\\s*\\*\\s*(?<name>${IDENTIFIER})` +
      `(?:\\s*=\\s*(?<sourceName>${IDENTIFIER}))?` +
      `\\s*;\\s*$`,
  ),

  //ASSIGNMENT 

  /**
   * pp = &q; 
   */
  doublePointerAssignmentV1: new RegExp(
    `^\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*&\\s*(?<target>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),
 
  /**
   * pp = qq; => Hard challenge 
   */
  doublePointerAssignmentV2: new RegExp(
    `^\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

  // FIRST DERERENCING 

  /**
   * *pp = &y; 
   */
  doublePointerFirstDereferenceV1: new RegExp(
    `^\\s*\\*\\s*(?<pointerName>${IDENTIFIER})` +
      `\\s*=\\s*&\\s*(?<target>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

  /**
   * *pp = q; 
   */
  doublePointerFirstDereferenceV2: new RegExp(
    `^\\s*\\*\\s*(?<pointerName>${IDENTIFIER})` +
      `\\s*=\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

  // SECOND DEREFERENCING 

  /**
   * **pp = 10; 
   */
  doublePointerSecondDereferenceV1: new RegExp(
    `^\\s*\\*\\s*\\*\\s*(?<pointerName>${IDENTIFIER})` +
      `\\s*=\\s*(?<value>${INTEGER_LITERAL})` +
      `\\s*;\\s*$`,
  ),

  /**
   * **pp = y; 
   */
  doublePointerSecondDereferenceV2: new RegExp(
    `^\\s*\\*\\s*\\*\\s*(?<pointerName>${IDENTIFIER})` +
      `\\s*=\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

  /**
   * **pp = *p; 
   */
  doublePointerSecondDereferenceV3: new RegExp(
    `^\\s*\\*\\s*\\*\\s*(?<pointerName>${IDENTIFIER})` +
      `\\s*=\\s*\\*\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

 
  // Connection between first and second dereferencing
  /**
   * int *q = *pp;
   */
  copyInnerPointerDeclaration: new RegExp(
    `^\\s*int\\s*\\*\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*\\*\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

  /**
   * q = *pp;
   */
  copyInnerPointerAssignment: new RegExp(
    `^\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*\\*\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

  // Connection between second dereferencing and varible
  /**
   * int y = **pp; 
   */
  DeclareInnerPointerSecondDereference: new RegExp(
    `^\\s*int\\s+(?<name>${IDENTIFIER})` +
      `\\s*=\\s*\\*\\s*\\*\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  ),

  /**
   * y = **pp; 
   */
  AssignInnerPointerSecondDereference: new RegExp(
    `^\\s*(?<name>${IDENTIFIER})` +
      `\\s*=\\s*\\*\\s*\\*\\s*(?<sourceName>${IDENTIFIER})` +
      `\\s*;\\s*$`,
  )


} as const;