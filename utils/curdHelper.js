const { Op, DataTypes } = require("sequelize");
const logger = require("../middleware/logger");
const sequelize = require("../config/db-source"); // Assume this is your Sequelize instance

const REST_API = {
  /**
   * Get all records with advanced querying options.
   * @param {Sequelize.Model} model - Sequelize model instance
   * @param {object} query - Query object with pagination, searching, filtering, and sorting options
   * @returns {Promise<object>} - Records data
   */
  getAll: async (model, query = {}) => {
    try {
      const { page = 1, limit = 10, search, filter, sort } = query;
      const offset = (page - 1) * limit;
      const where = {};
      let order = [];

      if (search) {
        where[Op.or] = Object.keys(model.rawAttributes)
          .filter(
            (attr) => model.rawAttributes[attr].type instanceof DataTypes.STRING
          )
          .map((attr) => ({
            [attr]: { [Op.like]: `%${search}%` },
          }));
      }

      if (filter) {
        Object.keys(filter).forEach((key) => {
          where[key] = filter[key];
        });
      }

      if (sort) {
        const [field, direction] = sort.split(":");
        order.push([field, direction.toUpperCase()]);
      }

      const result = await model.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        paranoid: true,
      });

      logger.info(
        `Read records from ${model.name} with query ${JSON.stringify(query)}`
      );
      return {
        rows: result.rows,
        count: result.count,
        totalPages: Math.ceil(result.count / limit),
        currentPage: parseInt(page),
      };
    } catch (error) {
      logger.error(
        `Error reading records from ${model.name}: ${error.message}`
      );
      throw error;
    }
  },

  /**
   * Get a record by ID or any other field.
   * @param {Sequelize.Model} model - Sequelize model instance
   * @param {string} fieldName - Field name to search by
   * @param {any} fieldValue - Value to search for
   * @returns {Promise<object>} - Record data
   */
  getDataListByField: async (model, fieldName, fieldValue) => {
    try {
      const result = await model.findAll({
        where: { [fieldName]: fieldValue },
        paranoid: true,
      });

      if (result.length === 0) {
        throw new Error(
          `${model.name} with ${fieldName} ${fieldValue} not found`
        );
      }

      logger.info(
        `Read record(s) from ${model.name} with ${fieldName} ${fieldValue}`
      );
      return result;
    } catch (error) {
      logger.error(`Error reading ${model.name}: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update a record.
   * @param {Sequelize.Model} model - Sequelize model instance
   * @param {number} id - Record ID
   * @param {object} data - Updated data
   * @returns {Promise<object>} - Updated record
   */
  update: async (model, id, data) => {
    const transaction = await sequelize.transaction();
    try {
      if (!data || Object.keys(data).length === 0) {
        throw new Error("Update data cannot be empty");
      }

      const [updatedRowsCount, updatedRows] = await model.update(data, {
        where: { id },
        returning: true,
        transaction,
        paranoid: true,
      });

      if (updatedRowsCount === 0) {
        throw new Error(
          `${model.name} with id ${id} not found or no changes applied`
        );
      }

      await transaction.commit();
      logger.info(`Updated record in ${model.name} with id ${id}`);
      return updatedRows[0];
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error updating record in ${model.name}: ${error.message}`);
      throw error;
    }
  },

  /**
   * Soft delete a record.
   * @param {Sequelize.Model} model - Sequelize model instance
   * @param {number} id - Record ID
   * @returns {Promise<void>}
   */
  delete: async (model, id) => {
    try {
      const result = await model.destroy({
        where: { id },
      });

      if (result === 0) {
        throw new Error(
          `${model.name} with id ${id} not found or already deleted`
        );
      }

      logger.info(`Soft deleted record from ${model.name} with id ${id}`);
    } catch (error) {
      logger.error(
        `Error soft deleting record from ${model.name}: ${error.message}`
      );
      throw error;
    }
  },

  /**
   * Create a new record.
   * @param {Sequelize.Model} model - Sequelize model instance
   * @param {object} data - Data to be inserted
   * @returns {Promise<object>} - Created record
   */
  create: async (model, data) => {
    const transaction = await sequelize.transaction();
    try {
      if (!data || Object.keys(data).length === 0) {
        throw new Error("Data cannot be empty");
      }

      const result = await model.create(data, { transaction });

      await transaction.commit();
      logger.info(`Created record in ${model.name} with id ${result.id}`);
      return result;
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error creating record in ${model.name}: ${error.message}`);
      throw error;
    }
  },
};

module.exports = REST_API;
