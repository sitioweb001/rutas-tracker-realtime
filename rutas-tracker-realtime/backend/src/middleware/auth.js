
import jwt from 'jsonwebtoken';
export function signToken(payload, expiresIn='12h'){
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}
export function authRequired(req,res,next){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ')? auth.slice(7): null;
  if(!token) return res.status(401).json({error:'Token requerido'});
  try{
    const dec = jwt.verify(token, process.env.JWT_SECRET);
    req.user = dec;
    next();
  }catch(e){ return res.status(401).json({error:'Token inválido'}); }
}
