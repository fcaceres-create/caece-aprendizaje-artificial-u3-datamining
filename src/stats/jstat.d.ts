declare module 'jstat' {
  interface Dist1 {
    cdf(x: number, df: number): number;
    inv(p: number, df: number): number;
  }
  export const jStat: {
    studentt: Dist1;
    chisquare: Dist1;
    centralF: {
      cdf(x: number, df1: number, df2: number): number;
      inv(p: number, df1: number, df2: number): number;
    };
    normal: {
      cdf(x: number, mean: number, sd: number): number;
      inv(p: number, mean: number, sd: number): number;
    };
  };
}
