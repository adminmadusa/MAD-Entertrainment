import { Request, Response, NextFunction } from 'express';

export function createCrudController<T>(
  service: {
    create: (data: any) => Promise<T>;
    getAll: () => Promise<T[]>;
    update: (id: string, data: any) => Promise<T | null>;
    delete: (id: string) => Promise<T | null>;
  },
  entityName: string, // e.g. 'Category' or 'Tier'
  keyName: string // e.g. 'category' or 'tier'
) {
  return {
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const item = await service.create(req.body);
        res.status(201).json({
          success: true,
          data: { [keyName]: item },
          message: `${entityName} created successfully`
        });
      } catch (error) {
        next(error);
      }
    },

    getAll: async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await service.getAll();
        res.status(200).json({
          success: true,
          data: result,
          message: `${entityName}s fetched successfully`
        });
      } catch (error) {
        next(error);
      }
    },

    update: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const item = await service.update(req.params.id, req.body);
        if (!item) {
          return res.status(404).json({ success: false, message: `${entityName} not found` });
        }
        res.status(200).json({
          success: true,
          data: { [keyName]: item },
          message: `${entityName} updated successfully`
        });
      } catch (error) {
        next(error);
      }
    },

    delete: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const item = await service.delete(req.params.id);
        if (!item) {
          return res.status(404).json({ success: false, message: `${entityName} not found` });
        }
        res.status(200).json({
          success: true,
          message: `${entityName} deleted successfully`
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
